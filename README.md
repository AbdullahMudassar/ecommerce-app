# E-Commerce DevOps Project

This repository contains the application source code for a small microservices-based e-commerce system.

The purpose of this project is not only to build the application, but also to practise a complete DevOps workflow including:

- Docker
- Kubernetes
- Kustomize
- GitHub Actions
- GitHub Container Registry
- Argo CD
- Prometheus
- Grafana
- Loki
- Alloy
- Alertmanager
- Sealed Secrets
- Horizontal Pod Autoscaling
- Load testing with k6
- GitOps-based rollback

The application is deployed to a local Kubernetes cluster created with **kind**.

---

# 1. Project Overview

The application is divided into multiple services.

```text
Frontend
   |
   +----------------------+
   |                      |
   v                      v
Product Service       Cart Service
   |
   |
   v
Order Service
   |
   v
Product Service
```

The main services are:

```text
product-service
cart-service
order-service
frontend
redis
```

Each service has a separate responsibility.

---

# 2. Application Services

## Product Service

The `product-service` is responsible for product information.

Example endpoint:

```text
GET /api/products
```

Example response:

```json
[
  {
    "id": 1,
    "name": "Wireless Mouse",
    "price": 25
  },
  {
    "id": 2,
    "name": "Mechanical Keyboard",
    "price": 89
  },
  {
    "id": 3,
    "name": "USB-C Hub",
    "price": 45
  }
]
```

The product service also provides a health endpoint:

```text
GET /health
```

A healthy service returns a successful HTTP response.

This endpoint is used by Kubernetes health/readiness checks.

The service also exposes Prometheus metrics:

```text
GET /metrics
```

Prometheus uses this endpoint to collect application metrics.

---

## Cart Service

The `cart-service` handles shopping-cart functionality.

It also connects to Redis for cart-related data.

Redis is deployed separately inside Kubernetes.

The cart service exposes application metrics so Prometheus can monitor it.

During the monitoring phase, Redis was also stopped intentionally to observe how failures appeared in:

- Grafana
- Prometheus metrics
- application logs

This helped demonstrate how monitoring can be used to troubleshoot service dependencies.

---

## Order Service

The `order-service` handles order creation.

An example order request is:

```json
{
  "userId": "u1",
  "productId": 1,
  "quantity": 2
}
```

Example endpoint:

```text
POST /api/orders
```

When an order is created, the order service contacts the product service to get product information.

The flow is:

```text
Client
  |
  v
Order Service
  |
  | GET product information
  v
Product Service
  |
  v
Order created
```

The order service also exposes:

```text
GET /api/orders
```

to view created orders.

---

## Payment Secret Status

The order service also contains this endpoint:

```text
GET /api/orders/status
```

This endpoint checks whether the application received the:

```text
PAYMENT_API_KEY
```

environment variable.

Example successful response:

```json
{
  "paymentConfigured": true
}
```

This was used during the Sealed Secrets exercise to verify that the secret successfully travelled through the complete flow:

```text
SealedSecret
    |
    v
Kubernetes Secret
    |
    v
order-service Pod
    |
    v
PAYMENT_API_KEY
    |
    v
Node.js application
```

---

# 3. Repository Structure

The main structure of this repository is:

```text
ecommerce-app/
|
+-- services/
|   |
|   +-- product-service/
|   |
|   +-- cart-service/
|   |
|   +-- order-service/
|   |
|   +-- frontend/
|
+-- .github/
|   |
|   +-- workflows/
|
+-- load-tests/
|   |
|   +-- shop-load-test.js
|
+-- LEARNINGS.md
|
+-- README.md
```

---

# 4. Services Directory

Application source code is stored under:

```text
services/
```

Each service has its own application code and Docker configuration.

For example:

```text
services/product-service/
```

contains the source code for the Product Service.

The services are containerized using Docker.

---

# 5. Docker

Each application service is built into a Docker image.

For example, the Product Service uses a Dockerfile similar to this flow:

```text
Application source code
        |
        v
Dockerfile
        |
        v
docker build
        |
        v
Container image
```

The container image contains everything required to run that service.

This allows the same application image to run consistently in:

```text
Developer machine
      |
      v
CI pipeline
      |
      v
Kubernetes
```

---

# 6. CI/CD Architecture

This repository is the **source-code repository**.

When application code is pushed to GitHub, GitHub Actions starts the CI/CD process.

The high-level flow is:

```text
Developer
   |
   | git push
   v
ecommerce-app
   |
   v
GitHub Actions
   |
   +--> Test application
   |
   +--> Build Docker image
   |
   +--> Scan/build checks
   |
   v
GitHub Container Registry
   |
   | new image
   v
ecommerce-gitops
   |
   | image tag updated
   v
Argo CD
   |
   v
Kubernetes
   |
   v
Application
```

This is one of the most important flows in the project.

---

# 7. GitHub Actions

GitHub Actions workflows are stored in:

```text
.github/workflows/
```

There are separate workflows for the application services.

Examples include:

```text
product-service.yml
cart-service.yml
order-service.yml
frontend.yml
```

The basic pipeline is:

```text
Code pushed
    |
    v
GitHub Actions triggered
    |
    v
Application tested
    |
    v
Docker image built
    |
    v
Image pushed to registry
    |
    v
GitOps repository updated
```

---

# 8. Why Two Repositories Are Used

The project uses two Git repositories.

## Application repository

```text
ecommerce-app
```

Contains:

```text
Source code
Dockerfiles
Tests
GitHub Actions
Load tests
Application documentation
```

## GitOps repository

```text
ecommerce-gitops
```

Contains:

```text
Kubernetes manifests
Kustomize configuration
Monitoring configuration
Sealed Secrets
Deployment configuration
```

Keeping these responsibilities separate makes the deployment flow easier to manage.

---

# 9. Container Registry

Built images are stored in GitHub Container Registry.

Example:

```text
ghcr.io/abdullahmudassar/product-service
```

Instead of always using a generic tag such as:

```text
latest
```

the CI pipeline can use a specific commit-based image tag.

For example:

```text
ghcr.io/abdullahmudassar/product-service:<git-sha>
```

This makes deployments easier to track.

We can answer:

```text
Which source-code version created this container?
```

by checking the image tag.

---

# 10. GitOps Deployment Flow

The application repository does not directly run:

```text
kubectl apply
```

against the cluster during normal deployment.

Instead:

```text
ecommerce-app
      |
      | CI builds image
      v
Container Registry
      |
      | CI updates image tag
      v
ecommerce-gitops
      |
      v
Argo CD
      |
      v
Kubernetes
```

The GitOps repository represents the desired state of the cluster.

Argo CD continuously compares:

```text
Desired state in Git
        |
        vs
        |
Actual Kubernetes state
```

and synchronizes the cluster.

---

# 11. Kubernetes Environment

The project runs on a Kubernetes cluster created using:

```text
kind
```

The cluster name is:

```text
ecommerce
```

The main application namespace is:

```text
ecommerce-dev
```

The monitoring components run mainly in:

```text
monitoring
```

Argo CD runs in:

```text
argocd
```

The Sealed Secrets controller runs in:

```text
kube-system
```

---

# 12. Traffic Flow

The application is exposed through Traefik.

The general request flow is:

```text
Browser / curl / k6
        |
        v
Traefik
        |
        v
Kubernetes Service
        |
        v
Application Pod
```

For example:

```text
http://shop.localtest.me/api/products
```

reaches the Product Service through the Kubernetes routing configuration.

---

# 13. Application Health Checks

Application health is checked through:

```text
/health
```

Example:

```text
GET /health
```

A successful health endpoint returns HTTP 200.

Kubernetes uses probes to determine whether an application is healthy and ready.

Conceptually:

```text
Kubernetes
    |
    | request /health
    v
Application
    |
    +--> HTTP 200
    |       |
    |       v
    |    Healthy
    |
    +--> HTTP 500
            |
            v
         Unhealthy
```

---

# 14. Rollback Drill

A rollback exercise was performed by intentionally changing the Product Service health endpoint to return:

```text
HTTP 500
```

The bad code was pushed to the application repository.

The flow was:

```text
Bad source code
      |
      v
GitHub Actions
      |
      v
New Docker image
      |
      v
GitOps repository updated
      |
      v
Argo CD
      |
      v
New Kubernetes Pods
      |
      v
/health returned 500
      |
      v
Pods failed readiness
```

The new Pods stayed:

```text
0/1 Ready
```

while Kubernetes kept the previous healthy version available.

---

# 15. GitOps Rollback

The rollback was performed through Git instead of manually changing Kubernetes.

The bad GitOps image update commit was identified.

Then:

```bash
git revert <bad-commit>
```

was used.

The recovery flow was:

```text
Bad image deployed
      |
      v
Failure detected
      |
      v
git revert in ecommerce-gitops
      |
      v
Revert pushed
      |
      v
Argo CD sync
      |
      v
Previous good image restored
      |
      v
Pods healthy again
```

This demonstrated an important GitOps principle:

```text
Recovery should come from Git
rather than manual changes in the cluster.
```

After the rollback, the broken source code in this repository was also fixed so that the next CI build would not recreate the same problem.

---

# 16. Monitoring

The application is monitored using:

```text
Prometheus
Grafana
```

Application services expose:

```text
/metrics
```

Prometheus collects these metrics.

The basic monitoring flow is:

```text
Application
    |
    | /metrics
    v
Prometheus
    |
    v
Grafana
```

---

# 17. ServiceMonitor

Prometheus discovers the application services using Kubernetes `ServiceMonitor` resources.

ServiceMonitors were created for:

```text
product-service
cart-service
order-service
```

They tell Prometheus:

```text
Which Service should be monitored?
Which port should be used?
Which endpoint should be scraped?
```

---

# 18. Grafana Dashboard

A custom Grafana dashboard called:

```text
Shop Overview
```

was created.

It shows important application information such as:

```text
Requests per second
Error percentage
95th percentile response time
Orders created per minute
Application logs
```

This dashboard was used during:

```text
Load testing
Failure testing
Self-healing testing
Alert testing
Rollback testing
```

---

# 19. Request Rate

The dashboard shows request rate using Prometheus metrics.

This helps answer:

```text
How much traffic is the application receiving?
```

During the k6 load test, the request rate increased significantly.

---

# 20. Error Rate

The dashboard also tracks HTTP 5xx errors.

This helps answer:

```text
Are users receiving server errors?
```

During the self-healing test, a temporary increase in errors was visible while Product Service Pods were being replaced.

---

# 21. p95 Response Time

The dashboard contains a p95 latency panel.

p95 means:

```text
95% of requests completed within this response time.
```

For example:

```text
p95 = 150 ms
```

means approximately:

```text
95 out of 100 requests
completed within 150 ms.
```

This is useful because an average response time can hide slow requests.

---

# 22. Orders Per Minute

The Order Service contains a Prometheus counter for orders.

Grafana uses this metric to show:

```text
Orders created per minute
```

During the k6 load test, this value increased significantly, proving that orders were successfully being created under load.

---

# 23. Logging

Centralized application logging is implemented using:

```text
Loki
Alloy
Grafana
```

The flow is:

```text
Application Pods
      |
      | logs
      v
Alloy
      |
      v
Loki
      |
      v
Grafana
```

Alloy discovers Kubernetes Pods and forwards their logs to Loki.

Grafana can then search and display those logs.

---

# 24. Example Log Search

Logs can be filtered by Kubernetes labels.

For example, Order Service logs can be searched using a LogQL query similar to:

```text
{namespace="ecommerce-dev", app="order-service"}
```

Specific messages can also be filtered.

Example:

```text
{namespace="ecommerce-dev", app="order-service"} |= "order created"
```

---

# 25. Alerting

Prometheus alert rules were created for important failure scenarios.

Examples include:

```text
ServiceHasNoPods
HighErrorRate
```

## ServiceHasNoPods

This alert fires when an important Deployment has:

```text
0 available Pods
```

for the configured duration.

## HighErrorRate

This alert fires when the HTTP 5xx error rate becomes higher than the configured threshold.

The alert flow is:

```text
Application metrics
      |
      v
Prometheus
      |
      | evaluates rules
      v
Alert fires
      |
      v
Alertmanager
```

---

# 26. Secrets Management

Sensitive configuration should not be stored as plaintext in Git.

The project uses:

```text
Sealed Secrets
```

for this purpose.

The Order Service uses a fake payment API key:

```text
PAYMENT_API_KEY
```

The secret flow is:

```text
Plain secret value
      |
      v
kubectl create secret --dry-run
      |
      v
kubeseal
      |
      v
Encrypted SealedSecret
      |
      v
GitOps repository
      |
      v
Argo CD
      |
      v
Kubernetes
      |
      v
Sealed Secrets Controller
      |
      v
Normal Kubernetes Secret
      |
      v
Order Service
```

The plaintext value is not stored in Git.

---

# 27. ConfigMap vs Secret

The application uses different Kubernetes resources for different types of configuration.

```text
ConfigMap
→ normal/non-sensitive configuration

Secret
→ sensitive configuration
```

Examples:

```text
Service URL
→ ConfigMap

API key
→ Secret
```

The Order Service loads its payment secret using:

```yaml
envFrom:
  - secretRef:
      name: order-secrets
```

This makes Secret keys available as environment variables inside the container.

---

# 28. Horizontal Pod Autoscaling

The project uses a Kubernetes Horizontal Pod Autoscaler.

The HPA watches resource usage and can increase the number of Pods.

Conceptually:

```text
Traffic increases
      |
      v
CPU increases
      |
      v
Metrics Server
      |
      v
HPA
      |
      v
Replica count increases
```

During the k6 load test, Product Service scaled from approximately:

```text
1 Pod
  |
  v
3 Pods
  |
  v
4 Pods
```

when CPU usage exceeded the configured target.

---

# 29. Load Testing with k6

Load testing is stored under:

```text
load-tests/
```

The main load-test script is:

```text
load-tests/shop-load-test.js
```

The test uses:

```text
20 virtual users
for 3 minutes
```

Each virtual user repeatedly:

```text
GET /api/products
      |
      v
POST /api/orders
      |
      v
sleep
      |
      v
repeat
```

Run the load test with:

```bash
k6 run load-tests/shop-load-test.js
```

---

# 30. What Was Observed During Load Testing

During the load test:

```text
Request rate increased
Orders/min increased
CPU usage increased
HPA increased replicas
Grafana displayed the changes
```

This demonstrated that:

```text
Application load
      |
      v
Metrics
      |
      v
Prometheus
      |
      v
HPA + Grafana
```

were working together.

---

# 31. Kubernetes Self-Healing Test

During the load test, Product Service Pods were deliberately deleted.

Example:

```bash
kubectl delete pod \
  -n ecommerce-dev \
  -l app=product-service
```

The Deployment and ReplicaSet detected that the required Pods were missing.

Kubernetes automatically created replacement Pods.

Observed flow:

```text
Running Pods
     |
     v
Pods manually deleted
     |
     v
ReplicaSet notices missing replicas
     |
     v
New Pods created
     |
     v
ContainerCreating
     |
     v
Running
     |
     v
Ready
```

Grafana showed a short error/latency change during the recovery, but application traffic recovered automatically.

This demonstrated Kubernetes self-healing.

---

# 32. Useful Application URLs

Product list:

```text
http://shop.localtest.me/api/products
```

Order status:

```text
http://shop.localtest.me/api/orders/status
```

These URLs are available while the local Kubernetes environment and Traefik routing are running.

---

# 33. Common Kubernetes Checks

Check cluster:

```bash
kubectl get nodes
```

Check application Pods:

```bash
kubectl get pods -n ecommerce-dev
```

Check Deployments:

```bash
kubectl get deployments -n ecommerce-dev
```

Check Services:

```bash
kubectl get svc -n ecommerce-dev
```

Check HPA:

```bash
kubectl get hpa -n ecommerce-dev
```

Check Product Service rollout:

```bash
kubectl rollout status deployment/product-service \
  -n ecommerce-dev
```

---

# 34. Troubleshooting

## Pod is not Ready

Check:

```bash
kubectl get pods -n ecommerce-dev
```

Then:

```bash
kubectl describe pod <pod-name> -n ecommerce-dev
```

Check logs:

```bash
kubectl logs <pod-name> -n ecommerce-dev
```

Things to investigate include:

```text
readiness probe failures
liveness probe failures
image pull failures
missing environment variables
dependency failures
```

---

## Application URL Does Not Work

First check Pods:

```bash
kubectl get pods -n ecommerce-dev
```

Then Services:

```bash
kubectl get svc -n ecommerce-dev
```

Then Ingress:

```bash
kubectl get ingress -n ecommerce-dev
```

Also verify Traefik is running.

---

## Argo Deployment Is Not Updating

Check:

```bash
kubectl get application ecommerce-dev -n argocd
```

Important states include:

```text
Synced
OutOfSync
Healthy
Progressing
Degraded
```

Remember:

```text
Synced
→ Kubernetes matches Git desired state

Healthy
→ resources are operating correctly
```

These are different concepts.

A deployment can be:

```text
Synced + Progressing
```

if Git has been applied but the application has not become fully healthy yet.

---

# 35. Important Lessons from This Project

This project demonstrates that DevOps is not only about deploying applications.

A complete system also needs:

```text
Automation
Monitoring
Logging
Alerting
Security
Scaling
Recovery
Documentation
```

The complete project flow can be summarized as:

```text
Developer
   |
   v
Application Code
   |
   v
GitHub
   |
   v
GitHub Actions
   |
   v
Tests + Build
   |
   v
Container Registry
   |
   v
GitOps Repository
   |
   v
Argo CD
   |
   v
Kubernetes
   |
   +------------------------+
   |                        |
   v                        v
Application              Monitoring
   |                        |
   |                        +--> Prometheus
   |                        |
   |                        +--> Grafana
   |                        |
   |                        +--> Loki
   |                        |
   |                        +--> Alertmanager
   |
   +--> HPA
   |
   +--> Sealed Secrets
   |
   +--> Self-healing
```

---

# 36. Main DevOps Concepts Practised

The project covers:

```text
Containerization
Kubernetes deployments
Services and networking
Ingress
Health probes
ConfigMaps
Secrets
Kustomize
GitHub Actions CI/CD
Container registries
GitOps
Argo CD
Prometheus monitoring
Grafana dashboards
Centralized logging
Loki
Alloy
Prometheus alert rules
Alertmanager
Sealed Secrets
Horizontal Pod Autoscaling
Load testing
Kubernetes self-healing
Git-based rollback
```

---

# 37. Companion Repository

The Kubernetes and GitOps configuration for this project is maintained separately in:

```text
ecommerce-gitops
```

That repository contains the Kubernetes manifests, Kustomize environments, monitoring configuration and encrypted SealedSecret configuration.

This repository (`ecommerce-app`) should mainly be considered the:

```text
Application + CI repository
```

while `ecommerce-gitops` is the:

```text
Deployment + desired-state repository
```

---

# 38. Final Architecture Summary

```text
                     DEVELOPER
                         |
                         | git push
                         v
                  ecommerce-app
                         |
                         v
                   GitHub Actions
                         |
              +----------+----------+
              |                     |
              v                     v
            Tests              Docker Build
                                    |
                                    v
                         GitHub Container Registry
                                    |
                                    v
                            ecommerce-gitops
                                    |
                                    v
                                Argo CD
                                    |
                                    v
                              Kubernetes
                                    |
             +----------------------+-------------------+
             |                      |                   |
             v                      v                   v
         Application              HPA             Sealed Secrets
             |
             +----------------------+
             |
             v
        Prometheus
             |
             +----------+
             |          |
             v          v
          Grafana   Alertmanager

Application Logs
      |
      v
    Alloy
      |
      v
     Loki
      |
      v
   Grafana
```

---

# 39. Purpose of This Project

The purpose of this project is to understand the complete path from:

```text
writing application code
```

to:

```text
building
testing
containerizing
deploying
monitoring
scaling
securing
troubleshooting
and recovering the application
```

using a practical DevOps workflow.
