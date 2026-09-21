// Jenkinsfile for fika-friday
// Builds the Docker image from the multi-stage Dockerfile, pushes it to a
// self-hosted registry, then rolls it out on the Rancher/Kubernetes cluster.
//
// Requires on the Jenkins agent running this pipeline:
//   - docker CLI (able to reach a Docker daemon — either installed on the
//     agent host, or /var/run/docker.sock mounted into the Jenkins container)
//   - kubectl CLI
//
// Requires these Jenkins credentials to exist (Manage Jenkins > Credentials):
//   - registry-creds        Username/password credential for your registry
//   - rancher-kubeconfig    Secret file credential: the kubeconfig for the
//                           target cluster (Rancher: Cluster > Download KubeConfig)
//   - vite-google-client-id Secret text credential holding the Google OAuth
//                           client ID (safe to hardcode instead if you prefer,
//                           since it's a public client ID, not a secret)

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        // --- Fill these in for your setup ---
        REGISTRY         = 'registry.example.com'   // your self-hosted registry host[:port]
        IMAGE_NAME        = 'fika-friday'
        IMAGE             = "${REGISTRY}/${IMAGE_NAME}"
        REGISTRY_CREDS    = 'registry-creds'         // Jenkins credentials ID
        KUBECONFIG_CRED   = 'rancher-kubeconfig'     // Jenkins credentials ID
        K8S_NAMESPACE     = 'default'                // namespace the workload lives in
        K8S_DEPLOYMENT    = 'fika-friday'             // Deployment name in Rancher
        K8S_CONTAINER     = 'fika-friday'             // container name inside that Deployment

        // Baked into the frontend bundle at build time — not secret values,
        // safe to leave as plain env vars.
        VITE_API_URL           = ''                  // empty = same-origin (correct for this single-container setup)
        VITE_GOOGLE_CLIENT_ID  = credentials('vite-google-client-id')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Determine tag') {
            steps {
                script {
                    def sha = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    env.IMAGE_TAG = "${env.BUILD_NUMBER}-${sha}"
                }
            }
        }

        stage('Build image') {
            steps {
                sh """
                    docker build \\
                        --build-arg VITE_API_URL=${VITE_API_URL} \\
                        --build-arg VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID} \\
                        -t ${IMAGE}:${IMAGE_TAG} \\
                        -t ${IMAGE}:latest \\
                        .
                """
            }
        }

        stage('Push image') {
            steps {
                withCredentials([usernamePassword(credentialsId: env.REGISTRY_CREDS, usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
                    sh """
                        echo "\$REG_PASS" | docker login ${REGISTRY} -u "\$REG_USER" --password-stdin
                        docker push ${IMAGE}:${IMAGE_TAG}
                        docker push ${IMAGE}:latest
                        docker logout ${REGISTRY}
                    """
                }
            }
        }

        stage('Deploy to Rancher') {
            steps {
                withCredentials([file(credentialsId: env.KUBECONFIG_CRED, variable: 'KUBECONFIG')]) {
                    sh """
                        kubectl set image deployment/${K8S_DEPLOYMENT} \\
                            ${K8S_CONTAINER}=${IMAGE}:${IMAGE_TAG} \\
                            -n ${K8S_NAMESPACE}
                        kubectl rollout status deployment/${K8S_DEPLOYMENT} -n ${K8S_NAMESPACE} --timeout=180s
                    """
                }
            }
        }
    }

    post {
        always {
            sh 'docker image prune -f || true'
        }
        success {
            echo "Deployed ${IMAGE}:${env.IMAGE_TAG} to ${K8S_NAMESPACE}/${K8S_DEPLOYMENT}"
        }
        failure {
            echo 'Build or deploy failed — check the stage logs above.'
        }
    }
}
