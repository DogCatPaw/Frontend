# Kubernetes Deployment Guide

이 가이드는 Next.js 프론트엔드 애플리케이션을 Kubernetes에 배포하는 방법을 설명합니다.

## 사전 요구사항

- Docker가 설치되어 있어야 합니다
- Kubernetes 클러스터에 접근 권한이 있어야 합니다
- `kubectl` CLI가 설치되어 있어야 합니다
- Docker Registry (Docker Hub, AWS ECR, Harbor 등)에 접근 권한이 있어야 합니다

## 1. Docker 이미지 빌드

### 방법 1: 환경변수를 빌드 시에 포함 (권장)

```bash
docker build \
  --build-arg NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=cab6b850e45d4bca425715d4cf096948 \
  --build-arg NEXT_PUBLIC_API_BASE_URL=http://petdid-netw-dogcatpaw-ap-4d87a-112091686-70fc68edac0a.kr.lb.naverncp.com \
  --build-arg NEXT_PUBLIC_BESU_RPC_URL=http://ing-besunetwork-besurpci-c2714-112134690-ab00043af5a6.kr.lb.naverncp.com \
  --build-arg NEXT_PUBLIC_BESU_WS_URL=ws://besu-networ-besu-rpc-ext-43e7a-108790139-4b974a576079.kr.lb.naverncp.com:8546 \
  --build-arg NEXT_PUBLIC_CHAIN_ID=1337 \
  --build-arg NEXT_PUBLIC_PET_DID_REGISTRY=0x22BbF60B7B2f0dbB0B815c84E3C238a4566120c3 \
  --build-arg NEXT_PUBLIC_GUARDIAN_REGISTRY=0x9B3745F83E65668723fc32509799e61f1b57C5d3 \
  --build-arg NEXT_PUBLIC_SHELTER_REGISTRY=0x3Ace09BBA3b8507681146252d3Dd33cD4E2d4F63 \
  --build-arg NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_ORzdMaqN3wPB1JpjlYxgV5AkYXQG \
  --build-arg TOSS_SECRET_KEY=test_sk_24xLea5zVAJL9kDPQ0oyrQAMYNwW \
  -t your-registry/frontend:v1.0.0 \
  -t your-registry/frontend:latest \
  .
```

### 방법 2: .env 파일 사용 (개발용)

```bash
# .env 파일에서 환경변수 자동으로 읽기
docker build \
  $(cat .env | grep -v '^#' | grep -v '^$' | sed 's/^/--build-arg /') \
  -t your-registry/frontend:v1.0.0 \
  .
```

## 2. Docker 이미지 푸시

```bash
# Docker Registry 로그인
docker login your-registry

# 이미지 푸시
docker push your-registry/frontend:v1.0.0
docker push your-registry/frontend:latest
```

## 3. Kubernetes 배포

### 3.1 ConfigMap 및 Secret 수정

`configmap.yaml`과 `secret.yaml` 파일에서 환경에 맞게 값을 수정하세요.

**주의:** Secret 파일은 절대 Git에 커밋하지 마세요!

### 3.2 Deployment 이미지 수정

`deployment.yaml` 파일에서 이미지 경로를 실제 레지스트리 주소로 변경하세요:

```yaml
image: your-registry/frontend:v1.0.0  # 실제 레지스트리 주소로 변경
```

### 3.3 Kubernetes 리소스 배포

```bash
# ConfigMap 생성
kubectl apply -f k8s/configmap.yaml

# Secret 생성
kubectl apply -f k8s/secret.yaml

# Deployment 및 Service 생성
kubectl apply -f k8s/deployment.yaml
```

### 3.4 배포 확인

```bash
# Pod 상태 확인
kubectl get pods -l app=frontend

# Deployment 상태 확인
kubectl get deployment frontend

# Service 확인
kubectl get service frontend-service

# Pod 로그 확인
kubectl logs -l app=frontend -f

# Pod 상세 정보 확인
kubectl describe pod -l app=frontend
```

## 4. Ingress 연결

이미 Ingress가 설정되어 있다고 하셨으므로, 다음 설정을 Ingress에 추가하세요:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: frontend-ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.class: nginx  # 사용 중인 Ingress Controller에 맞게 수정
    cert-manager.io/cluster-issuer: letsencrypt-prod  # HTTPS를 위한 설정 (선택사항)
spec:
  rules:
  - host: your-domain.com  # 실제 도메인으로 변경
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  # HTTPS를 위한 TLS 설정 (선택사항)
  # tls:
  # - hosts:
  #   - your-domain.com
  #   secretName: frontend-tls
```

## 5. 업데이트 배포

### 새 버전 배포

```bash
# 새 이미지 빌드 및 푸시
docker build -t your-registry/frontend:v1.0.1 .
docker push your-registry/frontend:v1.0.1

# Deployment 이미지 업데이트
kubectl set image deployment/frontend frontend=your-registry/frontend:v1.0.1

# 롤아웃 상태 확인
kubectl rollout status deployment/frontend

# 롤아웃 히스토리 확인
kubectl rollout history deployment/frontend
```

### 롤백

```bash
# 이전 버전으로 롤백
kubectl rollout undo deployment/frontend

# 특정 버전으로 롤백
kubectl rollout undo deployment/frontend --to-revision=2
```

## 6. 스케일링

```bash
# 수동 스케일링
kubectl scale deployment frontend --replicas=3

# 오토스케일링 (HPA) 설정
kubectl autoscale deployment frontend --min=2 --max=10 --cpu-percent=80
```

## 7. 문제 해결

### Pod이 시작되지 않는 경우

```bash
# Pod 이벤트 확인
kubectl describe pod -l app=frontend

# Pod 로그 확인
kubectl logs -l app=frontend --tail=100

# 이전 컨테이너 로그 확인 (재시작된 경우)
kubectl logs -l app=frontend --previous
```

### ConfigMap/Secret 업데이트

```bash
# ConfigMap 업데이트
kubectl apply -f k8s/configmap.yaml

# Secret 업데이트
kubectl apply -f k8s/secret.yaml

# Pod 재시작 (ConfigMap/Secret 변경사항 적용)
kubectl rollout restart deployment/frontend
```

## 8. 모니터링

```bash
# 리소스 사용량 확인
kubectl top pod -l app=frontend

# 이벤트 모니터링
kubectl get events --sort-by='.lastTimestamp' -w

# 상세 모니터링
kubectl get pod -l app=frontend -w
```

## 9. 정리

```bash
# 모든 리소스 삭제
kubectl delete -f k8s/deployment.yaml
kubectl delete -f k8s/configmap.yaml
kubectl delete -f k8s/secret.yaml
```

## 주의사항

1. **환경변수**: NEXT_PUBLIC_* 으로 시작하는 환경변수는 빌드 시에 코드에 포함됩니다. 민감한 정보는 포함하지 마세요.
2. **Secret 관리**: secret.yaml 파일은 Git에 커밋하지 말고, 안전한 방법으로 관리하세요.
3. **이미지 태그**: 프로덕션에서는 `latest` 태그 대신 버전 태그(v1.0.0)를 사용하세요.
4. **리소스 제한**: 실제 사용량에 맞게 resources.requests와 resources.limits를 조정하세요.
5. **Health Check**: 애플리케이션 특성에 맞게 livenessProbe와 readinessProbe를 조정하세요.

## 참고 링크

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Kubernetes Documentation](https://kubernetes.io/docs/home/)
- [Docker Documentation](https://docs.docker.com/)
