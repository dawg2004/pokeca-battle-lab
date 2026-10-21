# POKÉCA BATTLE LAB

ポケモンカードゲーム（ポケカ）のリアル対戦で勝つための、AI対戦シミュレーション＋戦術研究ツール。

## これはローカルで個人的に楽しむためのソフトです

このアプリは870個人がローカル環境で使うために作られています。Vercelなどの公開ホスティングにデプロイして他の人に使わせることは想定していません。

理由は、公式デッキコード読み込み機能（`ENABLE_OFFICIAL_DECK_FETCH`）が pokemon-card.com のデータを利用しており、同サイトの利用規約が次のように明記しているためです（2026-08-28確認、https://www.pokemon-card.com/policy.html）。

- 「データは、個人的に楽しむ場合に限って使用を許諾されるものであり」
- 「このサイトからは、データのコピー、複製、改変、出版、掲示、電送、配布することは固くお断りします。またこれらのデータを、他のインターネットなどの公衆ネットワーク上で利用することはできません。」

この制約を破らないよう、公式デッキコード読み込み機能はVercel / Netlify / Render / Railway / Fly.io / Cloudflare Pagesなど既知の公開ホスティング環境を検知すると、`ENABLE_OFFICIAL_DECK_FETCH`の設定に関わらず自動的に無効化されます（`lib/deck/officialFetch.ts`）。

Battle Lab独自のフィクスチャデッキ（`lib/deck/sampleDecks.ts`）を使ったバトル・シミュレーション機能自体には、この制約はかかりません。

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開く。

## AI Coach（任意）

バトル画面の「コーチに聞く」ボタンで、今の局面の推薦手・理由・リスクを日本語で返します。

1. Google AI Studio で Gemini API キーを作成
2. `.env.local` に `GEMINI_API_KEY=...` を書く（`.gitignore` 済み。キーはサーバー側でのみ使い、ブラウザには出ません）
3. `npm run dev` を再起動

- ルール判定と合法手の生成はエンジン側。AIは合法手の中から選ぶだけで、範囲外の手を返したら破棄します。
- AIに送るのは自分の手札（カード名）・場・直近ログと合法手一覧のみ。相手の手札は枚数だけです。
- 無料枠のデータはGoogleの製品改善に使われる場合があります。気になる場合は有料枠に切り替えてください。
- モデルは `COACH_MODEL` で変更できます。キー未設定でも他の機能は通常どおり動きます。

## スクリプト

- `npm run dev` — 開発サーバーを起動
- `npm test` — Vitestでテストを実行
- `npm run typecheck` — TypeScriptの型チェック
- `npm run build` — 本番ビルド（ローカルでの動作確認用。公開デプロイは想定していない）

## 詳しい仕様・設計判断・進捗

Claude Projectsの「Pokemon!」プロジェクトにある引き継ぎ仕様書（`claude/pokeca-battle-lab-handover.md`）を参照。
