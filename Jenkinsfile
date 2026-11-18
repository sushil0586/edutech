pipeline {
  agent {
    label "${params.JENKINS_AGENT_LABEL}"
  }

  options {
    timestamps()
    ansiColor('xterm')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '20'))
    timeout(time: 120, unit: 'MINUTES')
  }

  parameters {
    string(
      name: 'JENKINS_AGENT_LABEL',
      defaultValue: 'linux && docker',
      description: 'Agent label to run this pipeline on'
    )
    string(
      name: 'NODE_TOOL_NAME',
      defaultValue: 'node-20',
      description: 'Jenkins NodeJS tool name. Ignored when USE_SYSTEM_NODE=true.'
    )
    booleanParam(
      name: 'USE_SYSTEM_NODE',
      defaultValue: false,
      description: 'Use node/npm already available on the Jenkins agent instead of a Jenkins-managed NodeJS tool'
    )
    choice(
      name: 'PIPELINE_MODE',
      choices: ['ci', 'full'],
      description: 'ci = quality gates only; full = quality gates, immutable packaging, and authorized deployment'
    )
    choice(
      name: 'E2E_SUITE',
      choices: ['none', 'smoke', 'baseline', 'final-checkpoint'],
      description: 'Which Playwright suite to run during CI'
    )
    choice(
      name: 'DEPLOY_ENV',
      choices: ['none', 'staging', 'production'],
      description: 'Deployment target'
    )
    string(
      name: 'RELEASE_GIT_SHA',
      defaultValue: '',
      description: 'Required for deployment: exact full Git commit SHA to promote'
    )
    string(
      name: 'DEPLOY_APPROVAL_REFERENCE',
      defaultValue: '',
      description: 'Required for deployment: approved change/ticket reference (never a credential)'
    )
    string(
      name: 'DEPLOY_PUBLIC_ORIGIN',
      defaultValue: '',
      description: 'Required for deployment: authorized HTTPS origin, for example https://learn.accerio.in'
    )
    string(
      name: 'STAGING_DRAFT_EXAM_ID',
      defaultValue: '',
      description: 'Required for staging deployment: pre-provisioned synthetic assigned draft exam UUID'
    )
    booleanParam(
      name: 'RUN_BACKEND_TESTS',
      defaultValue: true,
      description: 'Run Django checks and tests'
    )
    booleanParam(
      name: 'RUN_FRONTEND_BUILD',
      defaultValue: true,
      description: 'Run Next.js typecheck and production build'
    )
  }

  environment {
    PYTHON_VERSION = '3.12'
    BACKEND_DIR = 'edutech_backend'
    FRONTEND_DIR = 'edutech_web'
    POSTGRES_CONTAINER = "jenkins-edutech-postgres-${env.BUILD_NUMBER}"
    DJANGO_DEBUG = '1'
    DB_NAME = 'test_edutech_db'
    DB_USER = 'postgres'
    DB_PASSWORD = 'postgres'
    DB_HOST = '127.0.0.1'
    DB_PORT = '5432'
    PLAYWRIGHT_WORKERS = '1'
    DEPLOY_PATH = '/var/www/nexora-learn/edutech'
    BACKEND_SERVICE = 'nexora-learn-backend'
    WEB_SERVICE = 'nexora-learn-web'
    NGINX_SERVICE = 'nginx'
    SSH_CREDENTIALS_ID = 'nexora-ssh'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Resolve Release Candidate') {
      steps {
        sh '''#!/usr/bin/env bash
          set -euo pipefail
          if [ "$PIPELINE_MODE" = "full" ]; then
            test "$DEPLOY_ENV" != "none"
            printf '%s' "$RELEASE_GIT_SHA" | grep -Eq '^[0-9a-fA-F]{40}$'
            test -n "$DEPLOY_APPROVAL_REFERENCE"
            printf '%s' "$DEPLOY_PUBLIC_ORIGIN" | grep -Eq '^https://[A-Za-z0-9.-]+(:[0-9]+)?$'
            if [ "$DEPLOY_ENV" = "staging" ]; then
              test "$DEPLOY_PUBLIC_ORIGIN" = "https://learn.accerio.in"
            fi
            test "$RUN_BACKEND_TESTS" = "true"
            test "$RUN_FRONTEND_BUILD" = "true"

            git fetch --no-tags origin main
            git cat-file -e "${RELEASE_GIT_SHA}^{commit}"
            git merge-base --is-ancestor origin/main "$RELEASE_GIT_SHA"
            git checkout --detach "$RELEASE_GIT_SHA"
            test "$(git rev-parse HEAD)" = "${RELEASE_GIT_SHA,,}"
          else
            test "$DEPLOY_ENV" = "none"
          fi

          test -z "$(git status --porcelain)"
          git rev-parse HEAD > .git/release_sha
          git rev-parse 'HEAD^{tree}' > .git/release_tree
        '''
      }
    }

    stage('Resolve Node Runtime') {
      when {
        expression { params.PIPELINE_MODE in ['ci', 'full'] }
      }
      steps {
        script {
          if (!params.USE_SYSTEM_NODE) {
            env.NODEJS_HOME = tool(name: params.NODE_TOOL_NAME, type: 'nodejs')
            env.PATH = "${env.NODEJS_HOME}/bin:${env.PATH}"
          }
        }
        sh '''#!/usr/bin/env bash
          set -euxo pipefail
          node --version
          npm --version
        '''
      }
    }

    stage('Start CI Postgres') {
      when {
        expression { params.PIPELINE_MODE in ['ci', 'full'] && params.RUN_BACKEND_TESTS }
      }
      steps {
        sh '''#!/usr/bin/env bash
          set -euxo pipefail
          docker rm -f "$POSTGRES_CONTAINER" || true
          docker run -d \
            --name "$POSTGRES_CONTAINER" \
            -e POSTGRES_DB="$DB_NAME" \
            -e POSTGRES_USER="$DB_USER" \
            -e POSTGRES_PASSWORD="$DB_PASSWORD" \
            -p 5432:5432 \
            postgres:16

          for _ in $(seq 1 30); do
            if docker exec "$POSTGRES_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
              exit 0
            fi
            sleep 2
          done

          echo "Postgres did not become ready in time." >&2
          docker logs "$POSTGRES_CONTAINER" || true
          exit 1
        '''
      }
    }

    stage('Backend Quality') {
      when {
        expression { params.PIPELINE_MODE in ['ci', 'full'] && params.RUN_BACKEND_TESTS }
      }
      steps {
        dir("${env.BACKEND_DIR}") {
          sh '''#!/usr/bin/env bash
            set -euxo pipefail
            python3 -m venv .venv
            . .venv/bin/activate
            python -m pip install --upgrade pip
            pip install -r requirements.txt
            python manage.py check
            python manage.py makemigrations --check --dry-run
            python manage.py test --noinput
          '''
        }
      }
    }

    stage('Frontend Quality') {
      when {
        expression { params.PIPELINE_MODE in ['ci', 'full'] && params.RUN_FRONTEND_BUILD }
      }
      steps {
        dir("${env.FRONTEND_DIR}") {
          sh '''#!/usr/bin/env bash
            set -euxo pipefail
            npm ci
            npm run verify:student
          '''
        }
      }
    }

    stage('Expo Quality and Release Policy') {
      when {
        expression { params.PIPELINE_MODE in ['ci', 'full'] }
      }
      steps {
        dir('nexora_student_mobile') {
          sh '''#!/usr/bin/env bash
            set -euo pipefail
            npm ci
            npm run typecheck
            npm run test:release-config
            if [ "$PIPELINE_MODE" = "full" ]; then
              export EXPO_PUBLIC_API_BASE_URL="$DEPLOY_PUBLIC_ORIGIN"
              if [ "$DEPLOY_ENV" = "production" ]; then
                export EAS_BUILD_PROFILE=production
              else
                export EAS_BUILD_PROFILE=preview
              fi
              npm run validate:release-config
            fi
          '''
        }
      }
    }

    stage('Playwright E2E') {
      when {
        expression { params.PIPELINE_MODE in ['ci', 'full'] && params.E2E_SUITE != 'none' }
      }
      environment {
        PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:3001'
        PLAYWRIGHT_API_BASE_URL = 'http://127.0.0.1:8010'
      }
      steps {
        dir("${env.BACKEND_DIR}") {
          sh '''#!/usr/bin/env bash
            set -euxo pipefail
            . .venv/bin/activate
            nohup .venv/bin/python manage.py runserver 127.0.0.1:8010 > ../backend-ci.log 2>&1 &
            echo $! > ../backend-ci.pid
          '''
        }
        dir("${env.FRONTEND_DIR}") {
          withCredentials([
            string(credentialsId: 'PLAYWRIGHT_STUDENT_USERNAME', variable: 'PLAYWRIGHT_STUDENT_USERNAME'),
            string(credentialsId: 'PLAYWRIGHT_STUDENT_PASSWORD', variable: 'PLAYWRIGHT_STUDENT_PASSWORD'),
            string(credentialsId: 'PLAYWRIGHT_TEACHER_USERNAME', variable: 'PLAYWRIGHT_TEACHER_USERNAME'),
            string(credentialsId: 'PLAYWRIGHT_TEACHER_PASSWORD', variable: 'PLAYWRIGHT_TEACHER_PASSWORD'),
            string(credentialsId: 'PLAYWRIGHT_INSTITUTE_USERNAME', variable: 'PLAYWRIGHT_INSTITUTE_USERNAME'),
            string(credentialsId: 'PLAYWRIGHT_INSTITUTE_PASSWORD', variable: 'PLAYWRIGHT_INSTITUTE_PASSWORD')
          ]) {
            sh '''#!/usr/bin/env bash
              set -euxo pipefail
              npm ci
              npx playwright install --with-deps chromium
              nohup npm run start -- --hostname 127.0.0.1 --port 3001 > ../frontend-ci.log 2>&1 &
              echo $! > ../frontend-ci.pid
            '''
            script {
              def selectedCommand = ''
              switch (params.E2E_SUITE) {
                case 'smoke':
                  selectedCommand = 'npm run test:e2e:smoke'
                  break
                case 'baseline':
                  selectedCommand = 'npm run test:e2e:baseline'
                  break
                case 'final-checkpoint':
                  selectedCommand = '''
                    npx playwright test \
                      tests/e2e/workflow/student-exams-workspace.spec.ts \
                      tests/e2e/workflow/student-exam-detail-workspace.spec.ts \
                      tests/e2e/workflow/student-attempt-runtime-workspace.spec.ts \
                      tests/e2e/workflow/student-results-workspace.spec.ts \
                      tests/e2e/workflow/student-post-submit-workspace.spec.ts \
                      tests/e2e/workflow/student-mobile-sanity-workspace.spec.ts \
                      tests/e2e/workflow/student-mobile-report-surfaces-visual.spec.ts \
                      tests/e2e/workflow/student-mobile-dashboard-analytics-visual.spec.ts \
                      tests/e2e/workflow/operator-mobile-report-surfaces-visual.spec.ts \
                      tests/e2e/workflow/operator-mobile-dense-visual.spec.ts \
                      tests/e2e/workflow/operator-mobile-dense-browser-coverage.spec.ts \
                      tests/e2e/workflow/admin-reports-workspace.spec.ts \
                      tests/e2e/workflow/admin-exams-workspace.spec.ts \
                      tests/e2e/workflow/teacher-exams-workspace.spec.ts \
                      tests/e2e/workflow/teacher-results-workspace.spec.ts \
                      tests/e2e/workflow/teacher-reports-workspace.spec.ts \
                      tests/e2e/workflow/institute-exams-workspace.spec.ts \
                      tests/e2e/workflow/institute-results-workspace.spec.ts \
                      tests/e2e/workflow/institute-reports-workspace.spec.ts \
                      --project=chromium
                  '''
                  break
                default:
                  error("Unsupported E2E_SUITE: ${params.E2E_SUITE}")
              }

              sh """#!/usr/bin/env bash
                set -euxo pipefail
                for _ in \$(seq 1 45); do
                  curl -fsS "$PLAYWRIGHT_API_BASE_URL/api/v1/health/" >/dev/null 2>&1 && \
                  curl -fsS "$PLAYWRIGHT_BASE_URL" >/dev/null 2>&1 && break
                  sleep 2
                done
                ${selectedCommand}
              """
            }
          }
        }
      }
    }

    stage('Package Immutable Release') {
      when {
        expression { params.PIPELINE_MODE == 'full' && params.DEPLOY_ENV != 'none' }
      }
      steps {
        sh '''#!/usr/bin/env bash
          set -euo pipefail
          RELEASE_SHA="$(cat .git/release_sha)"
          RELEASE_TREE="$(cat .git/release_tree)"
          rm -rf release
          mkdir -p release
          git archive --format=tar "$RELEASE_SHA" \
            deployment edutech_backend edutech_web nexora_student_mobile \
            | gzip -n > release/source.tar.gz
          python3 deployment/release_manifest.py create \
            --git-sha "$RELEASE_SHA" \
            --git-tree "$RELEASE_TREE" \
            --archive release/source.tar.gz \
            --environment "$DEPLOY_ENV" \
            --lockfile edutech_backend/requirements.txt \
            --lockfile edutech_web/package-lock.json \
            --lockfile nexora_student_mobile/package-lock.json \
            --output release/release-manifest.json
          python3 deployment/release_manifest.py verify \
            --manifest release/release-manifest.json \
            --archive release/source.tar.gz \
            --expected-sha "$RELEASE_SHA" \
            --expected-environment "$DEPLOY_ENV"
          sha256sum release/source.tar.gz release/release-manifest.json > release/SHA256SUMS
        '''
      }
    }

    stage('Deploy') {
      when {
        expression { params.PIPELINE_MODE == 'full' && params.DEPLOY_ENV != 'none' }
      }
      steps {
        script {
          def hostCredentialId = params.DEPLOY_ENV == 'production' ? 'NEXORA_PROD_HOST' : 'NEXORA_STAGE_HOST'
          withCredentials([string(credentialsId: hostCredentialId, variable: 'DEPLOY_HOST')]) {
            sshagent(credentials: [env.SSH_CREDENTIALS_ID]) {
              sh '''#!/usr/bin/env bash
                set -euo pipefail
                RELEASE_SHA="$(cat .git/release_sha)"
                RELEASE_ROOT="nexora-release-${BUILD_NUMBER}-${RELEASE_SHA:0:12}"

                scp -o StrictHostKeyChecking=yes \
                  release/source.tar.gz \
                  release/release-manifest.json \
                  deployment/release_manifest.py \
                  "ubuntu@${DEPLOY_HOST}:/tmp/"

                ssh -o StrictHostKeyChecking=yes "ubuntu@${DEPLOY_HOST}" \
                  "DEPLOY_PATH='${DEPLOY_PATH}' BACKEND_SERVICE='${BACKEND_SERVICE}' WEB_SERVICE='${WEB_SERVICE}' NGINX_SERVICE='${NGINX_SERVICE}' RELEASE_SHA='${RELEASE_SHA}' DEPLOY_ENV='${DEPLOY_ENV}' RELEASE_ROOT='${RELEASE_ROOT}' PUBLIC_ORIGIN='${DEPLOY_PUBLIC_ORIGIN}' bash -s" <<'EOF'
                  set -euo pipefail
                  RELEASE_DIR="/tmp/${RELEASE_ROOT}"
                  trap 'rm -rf "${RELEASE_DIR}"' EXIT
                  mkdir -p "${RELEASE_DIR}"
                  mv /tmp/source.tar.gz "${RELEASE_DIR}/source.tar.gz"
                  mv /tmp/release-manifest.json "${RELEASE_DIR}/release-manifest.json"
                  mv /tmp/release_manifest.py "${RELEASE_DIR}/release_manifest.py"
                  python3 "${RELEASE_DIR}/release_manifest.py" verify \
                    --manifest "${RELEASE_DIR}/release-manifest.json" \
                    --archive "${RELEASE_DIR}/source.tar.gz" \
                    --expected-sha "${RELEASE_SHA}" \
                    --expected-environment "${DEPLOY_ENV}"
                  mkdir -p "${RELEASE_DIR}/source"
                  tar -xzf "${RELEASE_DIR}/source.tar.gz" -C "${RELEASE_DIR}/source"
                  for component in deployment edutech_backend edutech_web nexora_student_mobile; do
                    mkdir -p "${DEPLOY_PATH}/${component}"
                    rsync -a --delete \
                      --exclude '.git' \
                      --exclude '.env' \
                      --exclude '.env.*' \
                      --exclude '*.jks' \
                      --exclude '*.keystore' \
                      --exclude '*.p12' \
                      --exclude '*.pem' \
                      --exclude '.venv' \
                      --exclude 'node_modules' \
                      --exclude 'media' \
                      "${RELEASE_DIR}/source/${component}/" "${DEPLOY_PATH}/${component}/"
                  done
                  install -m 0644 "${RELEASE_DIR}/release-manifest.json" "${DEPLOY_PATH}/release-manifest.json"
                  python3 "${DEPLOY_PATH}/deployment/release_manifest.py" env \
                    --manifest "${DEPLOY_PATH}/release-manifest.json" \
                    --output "${DEPLOY_PATH}/edutech_backend/.env.build"
                  install -m 0644 \
                    "${DEPLOY_PATH}/edutech_backend/.env.build" \
                    "${DEPLOY_PATH}/edutech_web/.env.build"

                  cd "${DEPLOY_PATH}/edutech_backend"
                  python3 -m venv .venv
                  . .venv/bin/activate
                  pip install --upgrade pip
                  pip install -r requirements.txt gunicorn
                  python ../deployment/run-with-env.py .env.production python manage.py check --deploy
                  python ../deployment/run-with-env.py .env.production python manage.py migrate --noinput
                  python ../deployment/run-with-env.py .env.production python manage.py collectstatic --noinput

                  cd "${DEPLOY_PATH}/edutech_web"
                  npm ci
                  set -a
                  . ./.env.build
                  set +a
                  npm run build

                  sudo nginx -t
                  sudo systemctl restart "${BACKEND_SERVICE}"
                  sudo systemctl restart "${WEB_SERVICE}"
                  sudo systemctl reload "${NGINX_SERVICE}"

                  sudo systemctl status "${BACKEND_SERVICE}" --no-pager
                  sudo systemctl status "${WEB_SERVICE}" --no-pager

                  ARTIFACT_SHA="$(python3 -c 'import json; print(json.load(open("'"${DEPLOY_PATH}/release-manifest.json"'"))["source_archive_sha256"])')"
                  "${DEPLOY_PATH}/deployment/verify-https-entrypoint.sh" \
                    "$PUBLIC_ORIGIN" "$RELEASE_SHA" "$ARTIFACT_SHA"
                EOF
              '''
            }
          }
        }
      }
    }

    stage('Staging Release Security Gate') {
      when {
        expression { params.PIPELINE_MODE == 'full' && params.DEPLOY_ENV == 'staging' }
      }
      environment {
        PLAYWRIGHT_BASE_URL = 'https://learn.accerio.in'
        PLAYWRIGHT_API_BASE_URL = 'https://learn.accerio.in'
      }
      steps {
        dir("${env.FRONTEND_DIR}") {
          withCredentials([
            string(credentialsId: 'PLAYWRIGHT_STAGING_DRAFT_STUDENT_USERNAME', variable: 'PLAYWRIGHT_STAGING_DRAFT_STUDENT_USERNAME'),
            string(credentialsId: 'PLAYWRIGHT_STAGING_DRAFT_STUDENT_PASSWORD', variable: 'PLAYWRIGHT_STAGING_DRAFT_STUDENT_PASSWORD')
          ]) {
            sh '''#!/usr/bin/env bash
              set -euo pipefail
              export PLAYWRIGHT_STAGING_DRAFT_EXAM_ID="$STAGING_DRAFT_EXAM_ID"
              export EXPECTED_RELEASE_GIT_SHA="$(cat ../.git/release_sha)"
              export EXPECTED_RELEASE_ARCHIVE_SHA256="$(python3 -c 'import json; print(json.load(open("../release/release-manifest.json"))["source_archive_sha256"])')"
              npm run test:e2e:staging-release-security
            '''
          }
        }
      }
    }
  }

  post {
    always {
      sh '''#!/usr/bin/env bash
        set +e
        if [ -f backend-ci.pid ]; then kill "$(cat backend-ci.pid)" || true; fi
        if [ -f frontend-ci.pid ]; then kill "$(cat frontend-ci.pid)" || true; fi
        docker rm -f "$POSTGRES_CONTAINER" || true
      '''
      archiveArtifacts artifacts: 'backend-ci.log,frontend-ci.log,release/**,edutech_web/playwright-report/**,edutech_web/test-results/**', allowEmptyArchive: true
      junit testResults: 'edutech_web/test-results/**/*.xml', allowEmptyResults: true
    }
  }
}
