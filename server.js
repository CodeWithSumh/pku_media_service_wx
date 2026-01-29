import express from 'express';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

// ��ȡ��ǰ�ļ���Ŀ¼·��
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// ���� dist Ŀ¼�еľ�̬�ļ�
app.use(express.static(path.join(__dirname, 'dist')));

// ����·�ɶ����� index.html (���ڵ�ҳӦ��)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ����Ƿ��� SSL ֤�飬�������ʹ�� HTTPS������ʹ�� HTTP
const keyPath = path.join(__dirname, 'cert', 'private.key');
const certPath = path.join(__dirname, 'cert', 'certificate.crt');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  // ʹ�� HTTPS
  const privateKey = fs.readFileSync(keyPath, 'utf8');
  const certificate = fs.readFileSync(certPath, 'utf8');
  
  https.createServer({ key: privateKey, cert: certificate }, app).listen(port, () => {
    console.log(HTTPS Server running at https://localhost:\);
    console.log(HTTPS Server running at https://127.0.0.1:\);
    console.log(HTTPS Server running at https://[::1]:\);
  });
} else {
  // ����Ƿ����ʹ�� mkcert ����֤��
  console.log('SSL certificates not found. Attempting to generate certificates...');
  
  // ʹ�� mkcert ����֤��
  try {
    import('mkcert').then(mkcertModule => {
      const mkcert = mkcertModule.default;
      
      // ����֤��Ŀ¼
      if (!fs.existsSync('cert')) {
        fs.mkdirSync('cert');
      }
      
      mkcert('localhost', '127.0.0.1', '::1')
        .then((certs) => {
          fs.writeFileSync('cert/private.key', certs.key);
          fs.writeFileSync('cert/certificate.crt', certs.cert);
          
          console.log('Certificates generated successfully!');
          
          // ʹ�������ɵ�֤������ HTTPS ������
          const privateKey = fs.readFileSync('cert/private.key', 'utf8');
          const certificate = fs.readFileSync('cert/certificate.crt', 'utf8');
          
          https.createServer({ key: privateKey, cert: certificate }, app).listen(port, () => {
            console.log(HTTPS Server running at https://localhost:\);
            console.log(HTTPS Server running at https://127.0.0.1:\);
            console.log(HTTPS Server running at https://[::1]:\);
          });
        })
        .catch(err => {
          console.error('Error generating certificates:', err);
          console.log('Falling back to HTTP server...');
          startHttpServer();
        });
    });
  } catch (err) {
    console.log('mkcert not available, falling back to HTTP server...');
    startHttpServer();
  }
}

function startHttpServer() {
  app.listen(port, () => {
    console.log(HTTP Server running at http://localhost:\);
    console.log(HTTP Server running at http://127.0.0.1:\);
    console.log('Note: For HTTPS, please install mkcert and generate certificates:');
    console.log('  1. Install mkcert globally: npm install -g mkcert');
    console.log('  2. Run: mkcert -install');
    console.log('  3. Create cert directory: mkdir cert');
    console.log('  4. Generate certificates: mkcert -key-file cert/private.key -cert-file cert/certificate.crt localhost 127.0.0.1 ::1');
  });
}
