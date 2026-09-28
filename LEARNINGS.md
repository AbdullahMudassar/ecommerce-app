# E-Commerce DevOps Project Learnings

## Phase 1 - Tool Versions

- Docker: 29.8.1
- Git: 2.34.1
- kubectl: v1.37.0
- kind: v0.33.0
- Helm: v3.22.0
- Kustomize: v5.8.1


## Task 2.3 - Product Service Observations

### What does the /metrics endpoint show?

The /metrics endpoint exposes Prometheus-format metrics using prom-client.
It includes default Node.js/process metrics and a custom histogram called
http_request_duration_seconds, which measures HTTP request duration using
method, route, and status_code labels.

### What format are the log lines in, and why is that useful?

The application uses Pino structured logging. Structured logs represent
information such as the HTTP method, request path, status code, and service
as separate fields. This makes logs easier to search, filter, and process.

### What happens when the app receives SIGTERM?

When SIGTERM is received, the application logs that shutdown has started
and calls server.close(). This stops the server from accepting new
connections and allows existing requests to finish. The process then exits
with status code 0, providing a graceful shutdown.


kubectl get pods -n ecommerce-dev
Lists Pods in the ecommerce-dev namespace.

kubectl describe pod -n ecommerce-dev <pod-name>
Shows detailed Pod information and events.

kubectl logs -n ecommerce-dev <pod-name>
Shows container logs.

kubectl logs -f -n ecommerce-dev <pod-name>
Follows container logs live.

kubectl scale deployment product-service --replicas=3 -n ecommerce-dev
Changes the desired number of product-service Pods.

kubectl exec -it -n ecommerce-dev <pod-name> -- sh
Opens an interactive shell inside the container.

kubectl delete pod -n ecommerce-dev <pod-name>
Deletes the Pod; the Deployment creates a replacement.
