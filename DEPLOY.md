# Deploy Votely（公网部署）

本项目默认用 **SQLite 文件**（`data/votely.db`）。  
**演示 / 临时免费** 与 **长期保留数据** 适合的方案不同，下面按场景选即可。

---

## 演示优先：尽量免费、少配置

### A. 本机运行 + Cloudflare 临时隧道（推荐，约 2 分钟）

不注册云平台、不产生托管费用；适合现场投屏或几小时试用。你的电脑要一直保持开机并联网。

1. 项目根目录：复制 `.env.example` 为 `.env.local`，填写 `ADMIN_SECRET`。
2. 启动应用：`npm run dev`（默认 http://localhost:3000）。
3. 安装 [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) 后执行：

```bash
cloudflared tunnel --url http://localhost:3000
```

终端里会得到一个 `https://xxxxx.trycloudflare.com` 地址，发给别人即可访问；关掉终端或 Ctrl+C 后链接失效。

### B. 本机运行 + ngrok

1. 同样先 `npm run dev`。  
2. 安装 [ngrok](https://ngrok.com/) 并完成一次性登录配置后：`ngrok http 3000`。  
免费档有会话时长与并发限制，适合短演示。

### C. Render 免费 Web（Docker，免本地电脑）

适合「不想一直开自己电脑」，能接受 **实例休眠、数据不一定持久** 的演示。

#### 事前准备

1. 代码在 **GitHub**（或 Render 支持的 Git 托管）的仓库里；本地可先提交并 `git push`。  
2. 管理员密钥：生成一段长随机字符串（部署时填到环境变量，**不要**写进 Git）。

#### 方式一：手动创建 Web Service（最直接）

1. 打开 **https://dashboard.render.com** 并登录（官网 **https://render.com** ，不是别的域名）。  
2. **New +** → **Web Service**。  
3. **Connect** 你的仓库；若首次使用需授权 GitHub 访问该库。  
4. 配置建议：  
   - **Name**：随意，如 `votely`  
   - **Region**：选离你近的即可  
   - **Branch**：`main`（或你的默认分支）  
   - **Runtime**：**Docker**  
   - **Dockerfile Path**：`Dockerfile`（根目录）  
   - **Instance type**：**Free**  
5. 点 **Environment** → **Add Environment Variable**：  
   - `ADMIN_SECRET` = 你的长随机密钥（必填，否则无法登录 `/admin`）。  
   - 勿勾选把密钥提交到仓库的选项。  
6. **Create Web Service**，等待构建（首次 Docker 构建可能需要几分钟）。  
7. 完成后用页面顶部的 **`https://xxx.onrender.com`** 访问；管理后台为 **`/admin`**，密钥即 `ADMIN_SECRET`。

#### 方式二：Blueprint（用仓库里的 `render.yaml`）

1. **New +** → **Blueprint**。  
2. 连接同一 Git 仓库；Render 会检测到 `render.yaml`。  
3. 按提示创建；界面里仍需为 **`ADMIN_SECRET`** 输入值（YAML 里为 `sync: false`，避免密钥进仓库）。  
4. 部署完成后同样使用 **`https://xxx.onrender.com`**。

#### 常见说明

- Render 会向容器注入 **`PORT`**，本项目的 Next.js standalone 会使用该端口，**无需**改 `Dockerfile`。  
- **注意（免费档）**：无流量一段时间会 **休眠**，首次访问会 **冷启动十几秒～更久**；磁盘 **非持久**，重新部署或部分重启后 **投票可能没了**。仅作演示；要长期保留数据请用本文 **Fly.io + 卷** 方案。

**账单**：免费档规则以 [Render Pricing](https://render.com/pricing) 为准；可能需绑卡验证，不一定产生月费。

---

## 长期运行 + 数据要保住：Fly.io

需要绑定支付方式，按用量计费（小额）。必须把 **`/app/data` 挂到持久卷**，否则 SQLite 会丢。

详见下文「Fly.io」小节；仓库内已有 `fly.toml` + `Dockerfile`。

---

## 1. Fly.io（持久卷）

### 准备

1. 安装 CLI：[Fly.io install](https://fly.io/docs/hands-on/install-flyctl/)
2. 注册并登录：`fly auth login`

### 首次发布

在项目根目录：

```bash
# 若 fly.toml 里 app 名已被占用，可先改 fly.toml 第一行 app = "你的名字"
fly launch
# 按需选择区域；若提示是否现在部署，可先 No，先建卷再部署

# 与 fly.toml 里 primary_region 一致（示例为 sin）
fly volumes create votely_data --region sin --size 1

fly secrets set ADMIN_SECRET="你的长随机密钥"

fly deploy
```

部署完成后终端会给出 `https://你的应用名.fly.dev`。管理后台为 `https://…/admin`。

### 维护

- 查看日志：`fly logs`
- 更新代码后：`fly deploy`

---

## 2. 本地验证镜像（可选）

```bash
docker build -t votely:local .
docker run --rm -p 3000:3000 -e ADMIN_SECRET=dev-secret -v votely-data:/app/data votely:local
```

浏览器打开 http://localhost:3000 。

---

## 3. 其他平台说明

- **Vercel 纯 Serverless**：与当前 `better-sqlite3` + 本地文件库组合不契合；若改为 Turso / Neon 等远程库可再考虑。
- **任意支持 Docker 的云**：持久数据请把卷挂到 **`/app/data`**，并设置 **`ADMIN_SECRET`**。

---

## 安全提示

- **`ADMIN_SECRET`** 需足够随机，不要提交到 Git（本地用 `.env.local`）。
- 演示隧道把整站暴露公网，演示结束请关掉 `cloudflared` / `ngrok` 或删除 Render 服务。
- 正式对外请务必使用 **HTTPS**（Render / Fly 默认提供）。
