// turbo-all

```bash
npm run build
npm run build
ssh -o StrictHostKeyChecking=accept-new -i ~/.ssh/id_rsa_clinicflow root@clinicflow.dev "rm -rf /var/www/clionotes/*"
scp -r -o StrictHostKeyChecking=accept-new -i ~/.ssh/id_rsa_clinicflow dist/* root@clinicflow.dev:/var/www/clionotes/
ssh -o StrictHostKeyChecking=accept-new -i ~/.ssh/id_rsa_clinicflow root@clinicflow.dev "docker restart caddy"
```
