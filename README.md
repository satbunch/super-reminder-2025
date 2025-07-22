# Super Reminder 2025

Firebase Functions + LINE Messaging API を使ったシンプルなリマインダー Bot。

ユーザーが「リマインドして」と送信すると、  
Bot が内容・時刻を聞いて Firestore にリマインダーを登録。  
指定時刻に LINE で通知を送信します。

---

## 🔧 開発環境

- Node.js 22
- TypeScript
- Firebase Functions (v2)
- Firestore
- LINE Bot SDK
- Firebase Secrets (チャネル情報管理)

---

## 🚀 構成

```

super-reminder-2025/
├── functions/         # Cloud Functions (TypeScript)
│   ├── src/
│   │   ├── api.ts         # LINE Webhook ハンドラー
│   │   ├── reminder.ts    # 定期実行でリマインダー通知
│   │   ├── parser.ts      # 時刻解析
│   │   ├── session.ts     # セッション管理
│   ├── .eslintrc.js
│   ├── package.json
│   ├── tsconfig.json
│   └── ...
└── .firebaserc       # 開発/本番プロジェクト切替

````

---

## ⚙️ 開発環境のセットアップ

### 1. Firebase CLI ログイン

```bash
firebase login
````

### 2. プロジェクト切り替え

開発用:

```bash
firebase use dev
```

本番用:

```bash
firebase use prod
```

### 3. Secrets 設定 (初回のみ)

開発環境:

```bash
firebase functions:secrets:set LINE_CHANNEL_ACCESS_TOKEN --project dev
firebase functions:secrets:set LINE_CHANNEL_SECRET --project dev
```

本番環境:

```bash
firebase functions:secrets:set LINE_CHANNEL_ACCESS_TOKEN --project prod
firebase functions:secrets:set LINE_CHANNEL_SECRET --project prod
```

---

## 🚀 デプロイ方法

### 開発環境

```bash
firebase deploy --only functions --project dev
```

### 本番環境

```bash
firebase deploy --only functions --project prod
```

---

## 🤖 Bot の動作概要

1. ユーザー：「リマインドして」
2. Bot：「後で思い出したいことを教えて」
3. ユーザー：「買い物」
4. Bot：「『買い物』だね！いつ教えて欲しい？」
5. ユーザー：「明日の朝」
6. 指定時刻に LINE で通知

---

## 🔍 データ構造 (Firestore)

| コレクション    | フィールド                     | 説明        |
| --------- | ------------------------- | --------- |
| sessions  | userId, status, task      | 会話セッション管理 |
| reminders | userId, message, remindAt | リマインダー管理  |

---

## 📅 定期実行

* `checkReminders` 関数 → 毎分実行 (`onSchedule`)
* Firestore から期限切れリマインダーを取得し、LINE に通知

---

## 🛡 注意事項

* リマインダー通知は pushMessage (無料枠 200通制限)
* 会話のやりとりは replyMessage で無料

---

## 🛠 今後の予定

* GitHub Actions による自動デプロイ
* Firestore のセキュリティルール強化
* CI テスト追加

---

## 📜 ライセンス

MIT
