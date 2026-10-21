pipeline {
    agent any

    environment {
        NODE_ENV = 'production'
        PORT = '5000'
        DOCKER_IMAGE = 'scm-time-machine:latest'
        LOCAL_SRC = 'C:\\Users\\Daksh\\.gemini\\antigravity\\scratch\\software-configuration-time-machine'
        FOSSIL_PATH = 'C:\\Users\\Daksh\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Fossil.Fossil_Microsoft.Winget.Source_8wekyb3d8bbwe\\fossil.exe'
        DOCKER_DIR = 'C:\\Users\\Daksh\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin'
    }

    stages {
        stage('1. Checkout / Source Preparation') {
            steps {
                echo '=== Checking out SCM Time Machine Source Repository ==='
                script {
                    boolean hasSCM = false
                    try {
                        hasSCM = (scm != null)
                    } catch (Exception e) {
                        hasSCM = false
                    }

                    if (hasSCM) {
                        checkout scm
                    } else if (isUnix()) {
                        sh "cp -r ${LOCAL_SRC}/* . ; if [ -f server/bin/fossil ]; then chmod +x server/bin/fossil; fi"
                    } else {
                        bat """
                            echo Refreshing project files from local directory...
                            xcopy /E /I /Y /Q "${LOCAL_SRC}" .
                        """
                    }
                }
            }
        }

        stage('2. Install Dependencies') {
            steps {
                echo '=== Installing Server and Client Dependencies ==='
                script {
                    if (isUnix()) {
                        dir('server') { sh 'npm install --include=dev' }
                        dir('client') { sh 'npm install --include=dev' }
                    } else {
                        dir('server') { bat 'npm install --include=dev' }
                        dir('client') { bat 'npm install --include=dev' }
                    }
                }
            }
        }

        stage('3. Run Backend & SCM Tests') {
            steps {
                echo '=== Executing Automated SCM Test Suite (Fossil + SQLite + REST) ==='
                script {
                    if (isUnix()) {
                        dir('server') { sh 'npm test' }
                    } else {
                        dir('server') { bat 'npm test' }
                    }
                }
            }
        }

        stage('4. Build Frontend (React + Vite)') {
            steps {
                echo '=== Compiling React SCM Console UI ==='
                script {
                    if (isUnix()) {
                        dir('client') { sh 'npm run build' }
                    } else {
                        dir('client') { bat 'npm run build' }
                    }
                }
            }
        }

        stage('5. Smoke Test & Seed Verification') {
            steps {
                echo '=== Verifying Demo SCM Seeding and Fossil Check-ins ==='
                script {
                    if (isUnix()) {
                        dir('server') { sh 'node src/database/seed.js' }
                    } else {
                        dir('server') { bat 'node src\\database\\seed.js' }
                    }
                }
            }
        }

        stage('6. Docker Image Build') {
            steps {
                echo '=== Building Production Multi-stage Docker Container ==='
                script {
                    if (isUnix()) {
                        sh 'docker build -t ${DOCKER_IMAGE} .'
                    } else {
                        bat """
                            set "PATH=%DOCKER_DIR%;C:\\Program Files\\Docker\\Docker\\resources\\bin;%PATH%"
                            where docker || (echo Docker executable found in user path: %DOCKER_DIR%\\docker.exe)
                            "%DOCKER_DIR%\\docker.exe" build -t %DOCKER_IMAGE% .
                        """
                    }
                }
            }
        }

        stage('7. Health Validation') {
            steps {
                echo '=== Validating Container Deployment Readiness ==='
                script {
                    if (isUnix()) {
                        sh 'docker inspect ${DOCKER_IMAGE}'
                    } else {
                        bat """
                            "%DOCKER_DIR%\\docker.exe" inspect %DOCKER_IMAGE%
                        """
                    }
                }
            }
        }
    }

    post {
        always {
            echo '=== Pipeline Execution Completed ==='
        }
        success {
            echo '✓ SCM Time Machine CI/CD Pipeline Passed Successfully!'
        }
        failure {
            echo '✖ Pipeline Failed. Inspect console output for details.'
        }
    }
}
