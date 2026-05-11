# 教育智能体测试1

面向 7-10 岁儿童的 iPad 课堂任务站。教师从白名单模板创建任务，学生提交文字和图片作品，AI 只生成适龄引导与反馈，教师后台查看完成情况，大屏网页展示学生作品。

## 快速启动

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

默认页面：

- 学生端：`/student`
- 教师后台：`/teacher`
- 大屏展示：`/display/[taskId]`
- 教师登录：`/teacher/login`
- 教师注册：`/teacher/register`
- 学生登录：`/student/login`
- 学生注册：`/student/register`

## 智美教育底座对接

底座 API 文档：`http://meiyu.cdbbox.com/api/docs`

当前已封装 `BaseAuthAdapter`：

- `POST /api/v1/app-auth/users/sync`
- `GET /api/v1/app-auth/users/by-email`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/authorize`
- `POST /api/v1/auth/token`
- `GET /api/v1/auth/me`
- `GET /api/v1/applications/{appId}/users?agentName=...`

班级和成员拉取接口在 Swagger 中缺少明确响应结构，因此集中预留在适配器中，后续只需要调整 `src/lib/base-auth-adapter.ts`。
