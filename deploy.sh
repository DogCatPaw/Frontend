#!/bin/bash

# Kubernetes 배포 스크립트
# Usage: ./deploy.sh [update]

set -e

NAMESPACE=${NAMESPACE:-default}

echo "🚀 Deploying to Kubernetes..."

if [ "$1" == "update" ]; then
    echo "📝 Updating existing deployment..."
    kubectl apply -f k8s/configmap.yaml -n ${NAMESPACE}
    kubectl apply -f k8s/secret.yaml -n ${NAMESPACE}
    kubectl apply -f k8s/deployment.yaml -n ${NAMESPACE}

    echo "♻️  Restarting deployment..."
    kubectl rollout restart deployment/frontend -n ${NAMESPACE}
else
    echo "📝 Creating new deployment..."
    kubectl apply -f k8s/configmap.yaml -n ${NAMESPACE}
    kubectl apply -f k8s/secret.yaml -n ${NAMESPACE}
    kubectl apply -f k8s/deployment.yaml -n ${NAMESPACE}
fi

echo "⏳ Waiting for rollout to complete..."
kubectl rollout status deployment/frontend -n ${NAMESPACE}

echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Current status:"
kubectl get pods -l app=frontend -n ${NAMESPACE}
echo ""
kubectl get service frontend-service -n ${NAMESPACE}
echo ""
echo "📝 To view logs:"
echo "   kubectl logs -l app=frontend -n ${NAMESPACE} -f"
echo ""
echo "📝 To check pod details:"
echo "   kubectl describe pod -l app=frontend -n ${NAMESPACE}"
