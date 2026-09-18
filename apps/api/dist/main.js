"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const node_http_1 = __importDefault(require("node:http"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { cors: true });
    const expressApp = app.getHttpAdapter().getInstance();
    const legacyBase = process.env.LEGACY_URL || 'http://legacy:3002';
    expressApp.use('/api', (req, res) => {
        const target = new URL(req.originalUrl, legacyBase);
        const headers = { ...req.headers, host: target.host };
        delete headers['content-length'];
        let body;
        if (!['GET', 'HEAD'].includes(req.method) && req.body && Object.keys(req.body).length) {
            body = JSON.stringify(req.body);
            headers['content-type'] = 'application/json';
            headers['content-length'] = Buffer.byteLength(body);
        }
        const proxy = node_http_1.default.request(target, { method: req.method, headers }, upstream => {
            res.status(upstream.statusCode || 502);
            Object.entries(upstream.headers).forEach(([key, value]) => {
                if (value !== undefined && key.toLowerCase() !== 'transfer-encoding')
                    res.setHeader(key, value);
            });
            upstream.pipe(res);
        });
        proxy.on('error', error => {
            if (!res.headersSent)
                res.status(502).json({ error: 'Legacy service unavailable', detail: error.message });
            else
                res.end();
        });
        if (body)
            proxy.end(body);
        else
            proxy.end();
    });
    await app.listen(Number(process.env.PORT || 3001), '0.0.0.0');
}
bootstrap();
//# sourceMappingURL=main.js.map