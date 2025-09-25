# NCLEX-RN 考试准备系统

## 🎯 项目介绍
专业的NCLEX-RN护士执照考试在线准备系统，提供真实的用户注册、登录和考试功能。

## 🚀 快速开始

### 访问网站
1. **注册账号**: 打开 `register.html` 创建新用户账号
2. **登录系统**: 打开 `login.html` 用注册的账号登录
3. **开始考试**: 登录后自动进入 `index-fullscreen-quiz.html` 考试系统

### 测试账号
```
邮箱: test@example.com
密码: Password123

邮箱: nurse@hospital.edu  
密码: NursePass1
```

## 📋 主要功能

### ✅ **用户系统**
- 真实用户注册和登录
- 会话管理和记住我功能
- 用户头像和个人信息显示
- 安全的密码加密存储

### ✅ **考试系统**
- 100道真实NCLEX-RN题库
- 多种题型支持（单选、多选）
- 详细的答案解析
- 进度跟踪和统计

### ✅ **界面特色**
- 专业医学主题设计
- 响应式移动端适配
- 无障碍访问支持
- 现代化用户体验

## 🔧 技术特点

- **前端**: HTML5, CSS3, JavaScript ES6+
- **数据库**: SQLite + IndexedDB
- **安全**: 密码哈希, CSRF保护, 输入验证
- **存储**: 本地持久化用户数据

## 📁 文件结构

```
├── index-fullscreen-quiz.html  # 主考试页面
├── login.html                 # 登录页面  
├── register.html             # 注册页面
├── js/
│   └── user-management.js    # 用户管理系统
└── data/
    └── nclex_question_bank.db # 题库数据库
```

## 🌐 部署说明

### GitHub Pages 部署
1. 将所有文件上传到 GitHub 仓库
2. 在仓库设置中启用 GitHub Pages
3. 访问 `https://yourusername.github.io/your-repo-name/login.html`

### 本地运行
```bash
# 启动本地服务器
python3 -m http.server 8080
# 或者
npx http-server

# 访问 http://localhost:8080/login.html
```

## 💡 使用说明

1. **首次访问**: 请先访问 `register.html` 创建账号
2. **日常使用**: 直接访问 `login.html` 登录
3. **考试答题**: 登录后在主页面选择考试类型开始答题
4. **查看进度**: 点击右上角头像查看个人信息

## 🔒 安全特性

- 客户端密码哈希加密
- CSRF 攻击防护
- XSS 输入过滤
- 会话超时保护
- 登录失败锁定机制

---

**开发者**: Claude AI  
**项目类型**: 医学教育 Web 应用  
**技术支持**: 现代浏览器（Chrome, Firefox, Safari, Edge）