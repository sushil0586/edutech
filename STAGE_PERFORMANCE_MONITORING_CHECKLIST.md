# Stage Performance Monitoring Checklist

Use this checklist while running the stage `k6` scripts.

Server:

- host: `3.106.125.117`
- SSH:

```bash
ssh -i ~/Downloads/bansalsushil05.pem ubuntu@3.106.125.117
```

## Goal

During each performance run, watch:

- CPU
- memory
- disk
- DB connections
- nginx errors
- backend service health
- request latency symptoms

## 1. Basic Live Host View

Run this first in one SSH tab:

```bash
htop
```

If `htop` is not installed:

```bash
top
```

Watch:

- overall CPU
- RAM usage
- swap usage
- python / gunicorn / uvicorn processes
- node / next processes

## 2. Memory Snapshot

Run this every few minutes:

```bash
free -h
```

What to watch:

- available memory
- used memory
- swap usage increasing quickly

Red flags:

- free memory near zero for long periods
- swap actively growing during load

## 3. Disk Space

```bash
df -h
```

What to watch:

- root volume usage
- log partition growth if separate

Red flag:

- disk usage above `85-90%`

## 4. Top Memory-Consuming Processes

```bash
ps aux --sort=-%mem | head -20
```

What to watch:

- postgres memory
- backend python memory
- frontend node memory
- any unexpected large processes

## 5. Top CPU-Consuming Processes

```bash
ps aux --sort=-%cpu | head -20
```

What to watch:

- postgres CPU
- backend CPU
- nginx worker spikes

## 6. Backend Service Health

```bash
sudo systemctl status nexora-learn-backend --no-pager
```

```bash
sudo journalctl -u nexora-learn-backend -n 100 --no-pager
```

Live follow:

```bash
sudo journalctl -u nexora-learn-backend -f
```

What to watch:

- worker crashes
- timeout errors
- Python exceptions
- database connection failures

## 7. Frontend Service Health

```bash
sudo systemctl status nexora-learn-web --no-pager
```

```bash
sudo journalctl -u nexora-learn-web -n 100 --no-pager
```

Live follow:

```bash
sudo journalctl -u nexora-learn-web -f
```

What to watch:

- frontend restarts
- out-of-memory termination
- rendering/server runtime errors

## 8. Nginx Error Monitoring

Check recent errors:

```bash
sudo tail -n 100 /var/log/nginx/error.log
```

Live follow:

```bash
sudo tail -f /var/log/nginx/error.log
```

Check access traffic:

```bash
sudo tail -n 100 /var/log/nginx/access.log
```

What to watch:

- `502`
- `504`
- upstream timeout
- upstream prematurely closed connection

## 9. HTTP Error Count Snapshot

Quick recent error summary:

```bash
sudo awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head
```

If you want just 5xx:

```bash
sudo awk '$9 ~ /^5/ {print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -nr
```

## 10. PostgreSQL Health

If PostgreSQL is on the same host, first enter:

```bash
sudo -u postgres psql
```

Then run:

```sql
select now();
select count(*) from pg_stat_activity;
select state, count(*) from pg_stat_activity group by state order by count(*) desc;
```

Useful active query view:

```sql
select pid, usename, state, wait_event_type, wait_event, query_start, left(query, 120)
from pg_stat_activity
where state <> 'idle'
order by query_start asc;
```

If enabled, slow query help:

```sql
select query, calls, total_exec_time, mean_exec_time
from pg_stat_statements
order by total_exec_time desc
limit 10;
```

What to watch:

- connection count rising too high
- many long-running active queries
- lock waits

## 11. Database Connection Pressure

From shell:

```bash
sudo -u postgres psql -c "select count(*) from pg_stat_activity;"
```

```bash
sudo -u postgres psql -c "select state, count(*) from pg_stat_activity group by state order by count(*) desc;"
```

Red flags:

- connection count grows continuously and never settles
- many waiting or blocked sessions

## 12. Load Average

```bash
uptime
```

What to watch:

- load average relative to CPU core count

If load average remains far above available cores for long periods, the host is under pressure.

## 13. Network Socket Pressure

```bash
ss -s
```

Optional:

```bash
ss -tan | head -50
```

What to watch:

- too many established connections
- unusual growth in waiting sockets

## 14. During Each k6 Run, Record

For every test, note:

- test name
- start time
- end time
- max target VUs
- whether runtime or login-only
- p95 latency from `k6`
- failure rate from `k6`
- peak CPU
- peak memory
- peak DB connections
- any 502/504 seen

## 15. Suggested Operator Setup

Use 4 terminal tabs:

### Tab 1. Run k6

Local machine:

```bash
k6 run performance/k6/student-login-and-exam-discovery.js
```

### Tab 2. Host load

Server:

```bash
htop
```

### Tab 3. Backend logs

Server:

```bash
sudo journalctl -u nexora-learn-backend -f
```

### Tab 4. Nginx errors

Server:

```bash
sudo tail -f /var/log/nginx/error.log
```

Optional Tab 5:

```bash
watch -n 5 "free -h; echo; df -h /; echo; sudo -u postgres psql -c 'select count(*) from pg_stat_activity;'"
```

## 16. What Is A Good First Sign

For the first controlled stage run, a good sign is:

- no service restart
- no 502/504
- low 5xx rate
- stable memory
- stable DB connections
- p95 latency stays reasonable

## 17. What Means Stop The Test

Stop and inspect immediately if:

- backend service restarts
- frontend service restarts
- repeated `502` or `504`
- memory exhausted or swap spikes heavily
- DB connection count runs away
- `k6` failure rate becomes material

## 18. Best First Run For Today

1. Run login/discovery only.
2. Watch server metrics.
3. If stable, run a very small runtime flow.
4. Increase slowly, not aggressively.
