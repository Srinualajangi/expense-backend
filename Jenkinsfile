pipeline {
    agent any

    environment {
        AWS_ACCOUNT_ID        = credentials('aws-account-id')
        AWS_ACCESS_KEY_ID     = credentials('aws-access-key')
        AWS_SECRET_ACCESS_KEY = credentials('aws-secret-key')
        AWS_REGION            = 'ap-south-1'
        ECR_REPO              = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        IMAGE_NAME            = 'expense-backend'
        IMAGE_TAG             = "${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/Srinualajangi/expense-backend.git'
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'npm test || echo "No tests yet"'
            }
        }

        stage('SAST - SonarQube') {
            steps {
                withSonarQubeEnv('sonarqube') {
                    sh '''
                        sonar-scanner \
                          -Dsonar.projectKey=expense-backend \
                          -Dsonar.sources=. \
                          -Dsonar.exclusions=node_modules/**,helm/** \
                          -Dsonar.host.url=$SONAR_HOST_URL \
                          -Dsonar.login=$SONAR_AUTH_TOKEN
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
            }
        }

        stage('Push to ECR') {
            steps {
                sh """
                    aws ecr get-login-password --region ${AWS_REGION} | \
                    docker login --username AWS --password-stdin ${ECR_REPO}
                    docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${ECR_REPO}/${IMAGE_NAME}:${IMAGE_TAG}
                    docker push ${ECR_REPO}/${IMAGE_NAME}:${IMAGE_TAG}
                """
            }
        }

        stage('Configure kubectl') {
            steps {
                sh "aws eks update-kubeconfig --name expense-dev --region ${AWS_REGION}"
            }
        }

        stage('Deploy to DEV') {
            steps {
                sh """
                    helm upgrade --install backend-dev ./helm \
                      -n expense-dev \
                      -f helm/env-values/dev.yaml \
                      --set image.repository=${ECR_REPO}/${IMAGE_NAME} \
                      --set image.tag=${IMAGE_TAG}
                """
            }
        }

        stage('Approval for STAGING') {
            steps {
                input message: 'Deploy to STAGING?', ok: 'Approve'
            }
        }

        stage('Deploy to STAGING') {
            steps {
                sh """
                    helm upgrade --install backend-staging ./helm \
                      -n expense-staging \
                      -f helm/env-values/staging.yaml \
                      --set image.repository=${ECR_REPO}/${IMAGE_NAME} \
                      --set image.tag=${IMAGE_TAG}
                """
            }
        }

        stage('Approval for PROD') {
            steps {
                input message: 'Deploy to PRODUCTION?', ok: 'Deploy to Prod'
            }
        }

        stage('Deploy to PROD') {
            steps {
                sh """
                    helm upgrade --install backend-prod ./helm \
                      -n expense-prod \
                      -f helm/env-values/prod.yaml \
                      --set image.repository=${ECR_REPO}/${IMAGE_NAME} \
                      --set image.tag=${IMAGE_TAG}
                """
            }
        }
    }

    post {
        success { echo '✅ Pipeline completed successfully!' }
        failure { echo '❌ Pipeline failed!' }
        always  { sh "docker rmi ${IMAGE_NAME}:${IMAGE_TAG} || true" }
    }
}
