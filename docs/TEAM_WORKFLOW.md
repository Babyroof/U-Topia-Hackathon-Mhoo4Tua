# Team Workflow (อ่านก่อนเริ่มงาน)

คู่มือนี้สรุปว่าทีมทำงานร่วมกันยังไงใน 24 ชั่วโมง อ่าน 5 นาทีพอ

## 0. เรากำลังทำอะไร (RWA Vault)

เอกสาร/ทรัพย์ที่มีต้นฉบับใบเดียว → partner ออก **NFT 1 ใบแทน (1:1)** → เจ้าของเก็บใน wallet → โอนให้คนอื่นแบบมีเงื่อนไขได้ (รายละเอียดเต็มใน `README.md`)

| Flow | ใครกด | contract / function |
|---|---|---|
| 1. ขอแปลงสินทรัพย์ | A | `RWAToken.requestTokenize(partner, assetType, name, serial, imageURI)` |
| 1. อนุมัติ / ปฏิเสธ | Partner | `RWAToken.approveRequest(id)` / `rejectRequest(id, reason)` |
| ดูของที่ถือ | ทุกคน | `RWAToken.tokensOf(user)`, `getAsset(id)`, `partnerName(addr)`, `getAllRequests()` |
| 2. ตั้งเงื่อนไขโอน | A | `RWAToken.approve(vault, id)` แล้ว `ConditionalVault.createDeal(id, B, unlockTime, deadline, price)` (โอนฟรี: `deadline` = 0, `price` = 0) |
| 2. จ่ายเงิน (โหมดขาย) | B | `ConditionalVault.pay(id)` ส่ง AVAX เท่ากับ `price` พอดี ภายใน `deadline` ถ้าถึงเวลาปลดล็อกแล้ว NFT กับ AVAX จะสลับกันใน tx เดียว |
| 2. ปล่อยให้ B | ใครก็ได้ | `ConditionalVault.release(id)` (เช็คก่อนด้วย `canRelease(id)`) |
| 2. ยกเลิก | A | `cancel(id)` ได้ก่อนถึงเวลา และต้องยังไม่ได้จ่ายเงิน |
| 2. เอาคืน (ขายแล้วไม่จ่าย) | A | `reclaim(id)` หลัง `deadline` ถ้า B ยังไม่จ่าย |
| ขอรับของจริง | ผู้ถือ | `RWAToken.requestRedeem(id)` → NFT ถูกพักไว้ใน contract · ยกเลิกได้ด้วย `cancelRedeem(rid)` |
| ส่งมอบของ + burn | Partner (ผู้ออก) | `RWAToken.confirmRedeem(rid)` |
| ปล่อยอัตโนมัติ | keeper | `ConditionalVault.checkUpkeep` → `performUpkeep` (เว็บเรียก `/api/keeper` ให้เอง) |

ตัวอย่าง `assetType` ใน demo: `Luxury Watch` (serial = เลขเครื่อง) และ `Land Title Deed` (serial = เลขโฉนด) ทำเป็น dropdown 2 ตัวนี้

เวลาเป็นวินาที (unix timestamp) ใน demo ให้ `unlockTime` = ตอนนี้ + 60 วินาที

**หน้าเว็บที่ต้องมี:** Tokenize (A) · Partner inbox (อนุมัติ/ปฏิเสธ) · My Vault (ของที่ถือ + ประวัติจาก event `Transfer`) · Send with conditions · Deals (Release / Cancel) · Redeem

**ฉากที่กรรมการต้องเห็น:** mint serial เดิมซ้ำ → ถูกปฏิเสธ · A เอาของที่ล็อกอยู่ไปขายซ้ำ → โอนไม่ได้

## 1. ครั้งแรกที่ clone repo

```bash
git clone <repo-url>
cd uhack-mhoo4tua
yarn install
```

## 2. ทุกครั้งที่เริ่มทำงาน: เปิด 3 terminal

| Terminal | คำสั่ง | ทำอะไร |
|---|---|---|
| 1 | `yarn chain` | blockchain จำลองในเครื่อง (เปิดทิ้งไว้) |
| 2 | `yarn deploy` | deploy contract (รันใหม่ทุกครั้งที่แก้ `.sol`) |
| 3 | `yarn start` | เว็บที่ http://localhost:3000 (เปิดทิ้งไว้) |

เพื่อนที่ใช้ Windows และลง Foundry ไม่ได้: รันแค่ `yarn start` แล้วทำ UI ด้วย mock data ไปก่อน

## 3. ลูปการทำงาน

```
แก้โค้ดใน VS Code
   ├─ แก้ contract (.sol)  → yarn deploy → ดูที่หน้า Debug Contracts
   └─ แก้หน้าเว็บ (.tsx)   → เว็บรีเฟรชเอง
```

## 4. ใครแก้ไฟล์ไหน (ห้ามแก้ของคนอื่นโดยไม่บอก)

| บทบาท | โฟลเดอร์ |
|---|---|
| Contract | `packages/foundry/contracts`, `test`, `script` |
| Frontend | `packages/nextjs/app`, `packages/nextjs/components` |
| API / AI | `packages/nextjs/app/api` |
| ห้ามแก้ด้วยมือ | `packages/nextjs/contracts/deployedContracts.ts` (สร้างอัตโนมัติจาก `yarn deploy`) |

## 5. Git: branch → PR → merge

```bash
git checkout main && git pull
git checkout -b feat/<ชื่อสั้นๆ>       # เช่น feat/pay-button
# ...ทำงาน...
git add .
git commit -m "feat: add pay button"
git push -u origin feat/<ชื่อสั้นๆ>
```

จากนั้นเปิด Pull Request บน GitHub → รอ CI ขึ้น ✅ ทั้ง 3 ช่อง → merge

**merge ทุก 2–3 ชั่วโมง** อย่ารอวันสุดท้าย

## 6. CI เช็กอะไรบ้าง (GitHub Actions)

ทุกครั้งที่ push หรือเปิด PR เข้า `main` จะรันอัตโนมัติ:

| Job | เช็กอะไร | ถ้าแดง แก้ยังไง |
|---|---|---|
| 🔐 Secret scan | ไม่มี private key / API key / `.env` หลุดเข้า repo | ลบ key ออก แล้ว `git rm --cached .env` |
| ⛓️ Contracts | `forge build` + `forge test` ผ่าน | รัน `yarn test` ในเครื่อง ดู error |
| 🖥️ Frontend | ESLint + TypeScript ผ่าน | รัน `yarn next:lint` และ `yarn next:check-types` |

เช็กแบบเดียวกันในเครื่องก่อน push ได้ด้วย `bash scripts/check-secrets.sh` หรือสั่ง agent `pr-checker`

## 7. ใช้ AI agents (Claude Code)

เปิด Claude Code ในโฟลเดอร์โปรเจค แล้วสั่งโดยระบุชื่อ agent เช่น

- "ใช้ **contract-writer** เขียน contract ที่มีฟังก์ชัน deposit กับ withdraw พร้อม test"
- "ใช้ **frontend-writer** ทำหน้า /pool ที่มีปุ่ม deposit เรียก contract"
- "ใช้ **security-reviewer** ตรวจ contract ก่อน deploy ขึ้น Fuji"
- "ใช้ **pr-checker** เช็ก branch นี้ก่อน merge"

## 8. Deploy ขึ้น Avalanche Fuji (คนดูแล contract ทำคนเดียว)

```bash
yarn generate                         # สร้าง deployer account ครั้งเดียว
yarn account                          # ดู address → ขอ test AVAX ให้ address นี้
yarn deploy --network avalancheFuji
```

แล้วแก้ `packages/nextjs/scaffold.config.ts` เป็น `targetNetworks: [chains.avalancheFuji]` แล้ว push

## 9. กฎความปลอดภัย

- ห้าม commit `.env`, private key, seed phrase
- API key ใช้เฉพาะใน `app/api/**/route.ts`
- ใช้ wallet ที่สร้างใหม่สำหรับงานนี้เท่านั้น

## 10. เส้นตาย (วันศุกร์ 16 ต.ค.)

| เวลา | อะไร |
|---|---|
| 10:00 | มี Fuji AVAX ใน deployer address แล้ว |
| 11:00 | flow 1 + 2 ใช้ได้บน Fuji · Feature freeze |
| 12:00 | deploy Vercel + อัดวิดีโอ demo สำรอง |
| 13:45 | ส่งงานให้เสร็จ (ปิดรับ 14:00) |
