# AWS notes

I split the AWS setup into three files. I will deploy them in this order:

1. `storage.yml`
2. `backend-service.yml`
3. `frontend-hosting.yml`

I will use the storage outputs for the backend, then push the backend image to
ECR. After ECS starts, I will check the `HealthUrl` before deploying Amplify.

I still need my AWS, database, network, and GitHub settings. I will not put
those private values in Git.
