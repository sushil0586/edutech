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
      choices: ['ci', 'cd', 'full'],
      description: 'ci = quality gates only, cd = deploy only, full = quality gates and deploy'
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
        sh 'git rev-parse --short HEAD > .git/short_sha'
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
        sh '''
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
        sh '''
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
          sh '''
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
          sh '''
            set -euxo pipefail
            npm ci
            npm run verify:student
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
          sh '''
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
            sh '''
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

              sh """
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

    stage('Deploy') {
      when {
        expression { params.PIPELINE_MODE in ['cd', 'full'] && params.DEPLOY_ENV != 'none' }
      }
      steps {
        script {
          def hostCredentialId = params.DEPLOY_ENV == 'production' ? 'NEXORA_PROD_HOST' : 'NEXORA_STAGE_HOST'
          withCredentials([string(credentialsId: hostCredentialId, variable: 'DEPLOY_HOST')]) {
            sshagent(credentials: [env.SSH_CREDENTIALS_ID]) {
              sh '''
                set -euxo pipefail
                SHORT_SHA="$(cat .git/short_sha)"
                rsync -az --delete \
                  --exclude '.git' \
                  --exclude 'node_modules' \
                  --exclude 'playwright-report' \
                  --exclude 'test-results' \
                  ./ "ubuntu@${DEPLOY_HOST}:${DEPLOY_PATH}/"

                ssh -o StrictHostKeyChecking=no "ubuntu@${DEPLOY_HOST}" <<'EOF'
                  set -euxo pipefail
                  cd "${DEPLOY_PATH}/edutech_backend"
                  python3 -m venv .venv
                  . .venv/bin/activate
                  pip install --upgrade pip
                  pip install -r requirements.txt gunicorn
                  python manage.py migrate --noinput
                  python manage.py collectstatic --noinput || true

                  cd "${DEPLOY_PATH}/edutech_web"
                  npm ci
                  npm run build

                  sudo systemctl restart "${BACKEND_SERVICE}"
                  sudo systemctl restart "${WEB_SERVICE}"
                  sudo systemctl reload "${NGINX_SERVICE}" || true

                  sudo systemctl status "${BACKEND_SERVICE}" --no-pager
                  sudo systemctl status "${WEB_SERVICE}" --no-pager
                EOF
              '''
            }
          }
        }
      }
    }
  }

  post {
    always {
      sh '''
        set +e
        if [ -f backend-ci.pid ]; then kill "$(cat backend-ci.pid)" || true; fi
        if [ -f frontend-ci.pid ]; then kill "$(cat frontend-ci.pid)" || true; fi
        docker rm -f "$POSTGRES_CONTAINER" || true
      '''
      archiveArtifacts artifacts: 'backend-ci.log,frontend-ci.log,edutech_web/playwright-report/**,edutech_web/test-results/**', allowEmptyArchive: true
      junit testResults: 'edutech_web/test-results/**/*.xml', allowEmptyResults: true
    }
  }
}
