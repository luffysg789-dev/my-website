# 中国象棋真钱房间设计说明

## 1. 目标

在 Nexa App WebView 内新增一个手机版优先的“中国象棋在线”页面，支持：

- 用户通过 Nexa 登录进入游戏
- 用户从 Nexa 余额充值 USDT 到站内游戏账户
- 用户从站内游戏账户提现 USDT 到 Nexa 余额
- 用户创建带 stake 的对战房间
- 另一位用户输入房间号加入对局
- 双方在线实时进行中国象棋对局
- 对局结束后按胜负在站内账本结算
- 和棋或超时则双方不输钱

本项目第一阶段采用：

- `充值/提现` 走 Nexa API
- `输赢结算` 走站内账本
- `手机版优先`
- `真实资金房间`

## 2. 业务规则

### 2.1 登录与身份

- 用户必须通过 Nexa 授权登录
- 站内以 Nexa `openid` 作为玩家唯一身份
- 登录成功后在站内创建或更新对应玩家资料

### 2.2 钱包

- 钱包币种固定为 `USDT`
- 每个用户有两种余额：
  - `available_balance` 可用余额
  - `frozen_balance` 冻结余额
- 创建房间或加入房间前，必须校验可用余额是否足够
- 一名用户同一时刻最多只能参与一个活跃房间或对局

### 2.3 充值

- 用户输入充值金额后，服务端创建 Nexa 支付订单
- 用户在 Nexa App 内完成支付
- Nexa 支付通知成功后，站内钱包增加对应金额
- 充值金额仅在支付通知验签并确认成功后入账

### 2.4 提现

- 用户只允许从可用余额发起提现
- 服务端创建 Nexa 提现申请
- 提现处理中时，站内余额先扣减并记录流水
- 若 Nexa 提现失败，则补回余额
- 若 Nexa 提现成功，则该笔提现最终完成

### 2.5 房间与 stake

- 创建房间时用户输入：
  - 本局输赢金额 `stake`
  - 局时 `10 / 15 / 30` 分钟
- 创建房间成功后，房主的 `stake` 立即冻结
- 另一位用户加入房间时，也需冻结同额 `stake`
- 若余额不足：
  - 不能创建房间
  - 不能加入房间

### 2.6 对局与结算

- 双方都进入房间后开始对局
- 胜者获得对手的 `stake`
- 败者失去自己的 `stake`
- 胜者自己的 `stake` 返还
- 和棋时，双方 stake 全额解冻退回
- 超时按和棋处理
- 开局前取消房间，所有已冻结 stake 原路退回
- 开局后不允许取消房间，只允许认输、求和、走棋至结束

## 3. 页面设计方向

页面采用“国风竞技版”视觉方向，避免普通后台页面风格。

### 3.1 视觉语言

- 背景：深木色渐变、轻纹理、淡金装饰
- 主色：朱砂红、墨黑、暖金
- 棋盘：拟物木纹风格，保持高识别度
- 卡片：账册感和印章感结合
- 动效：仅保留落子、结算、充值成功、房间加入成功等关键反馈

### 3.2 手机版布局

#### 顶部区域

- 游戏标题：中国象棋在线
- 副标题：真钱房间对战，胜负即时结算
- 当前登录态

#### 钱包卡

- 可用余额
- 冻结中余额
- 充值按钮
- 提现按钮
- 最近一条资金动态

#### 房间区域

- 创建房间卡
  - 输入 stake
  - 选择局时
  - 创建按钮
- 加入房间卡
  - 输入房间号
  - 加入按钮
- 手机端纵向堆叠，桌面端可双列

#### 对局区域

- 顶部玩家信息条
  - 红黑方
  - 双方昵称/头像
  - stake
  - 剩余时间
- 主棋盘
- 底部操作区
  - 认输
  - 求和
  - 复制房间号
  - 返回大厅

#### 结算弹层

- 胜利：显示赢得金额
- 失败：显示输掉金额
- 和棋/超时：显示 stake 已退回

## 4. 技术方案

### 4.1 架构

- 后端：Node.js + Express + SQLite
- 前端：静态页面 + 原生 JavaScript
- 实时同步：第一版使用 `SSE + POST`
- 棋局规则校验：服务端负责
- 资金与结算：服务端负责，数据库事务保证一致性

### 4.2 为什么用 SSE

- 比 WebSocket 更轻量
- 适合当前项目现有技术栈
- 足够覆盖房间状态和走子广播
- 便于先快速上线第一版

## 5. 数据模型

### 5.1 game_users

- `id`
- `openid` unique
- `nickname`
- `avatar`
- `created_at`
- `updated_at`

### 5.2 game_wallets

- `user_id` primary key
- `currency`
- `available_balance`
- `frozen_balance`
- `updated_at`

### 5.3 game_wallet_ledger

- `id`
- `user_id`
- `type`
- `amount`
- `balance_after`
- `related_type`
- `related_id`
- `remark`
- `created_at`

类型包括：

- `deposit_success`
- `withdraw_pending`
- `withdraw_success`
- `withdraw_failed_refund`
- `freeze_stake`
- `unfreeze_stake`
- `match_win`
- `match_loss`

### 5.4 nexa_game_deposits

- `id`
- `partner_order_no` unique
- `user_id`
- `amount`
- `currency`
- `status`
- `nexa_order_no`
- `notify_payload`
- `created_at`
- `paid_at`

### 5.5 nexa_game_withdrawals

- `id`
- `partner_order_no` unique
- `user_id`
- `amount`
- `currency`
- `status`
- `notify_payload`
- `created_at`
- `finished_at`

### 5.6 xiangqi_rooms

- `id`
- `room_code` unique
- `creator_user_id`
- `joiner_user_id`
- `stake_amount`
- `time_control_minutes`
- `status`
- `created_at`
- `started_at`
- `finished_at`

状态包括：

- `WAITING`
- `READY`
- `PLAYING`
- `FINISHED`
- `CANCELED`

### 5.7 xiangqi_matches

- `id`
- `room_id`
- `red_user_id`
- `black_user_id`
- `current_fen`
- `turn_side`
- `red_time_left_ms`
- `black_time_left_ms`
- `status`
- `result`
- `winner_user_id`
- `last_move_at`
- `created_at`
- `finished_at`

结果包括：

- `RED_WIN`
- `BLACK_WIN`
- `DRAW`
- `TIMEOUT_DRAW`
- `RED_RESIGN`
- `BLACK_RESIGN`

### 5.8 xiangqi_moves

- `id`
- `match_id`
- `move_no`
- `side`
- `from_pos`
- `to_pos`
- `fen_after`
- `created_at`

## 6. API 设计

### 6.1 会话

- `POST /api/xiangqi/session`
  - 使用 Nexa `authCode` 登录并建立站内玩家会话

### 6.2 钱包

- `GET /api/xiangqi/wallet`
- `GET /api/xiangqi/wallet/ledger`
- `POST /api/xiangqi/deposit/create`
- `POST /api/xiangqi/deposit/query`
- `POST /api/xiangqi/deposit/notify`
- `POST /api/xiangqi/withdraw/create`
- `POST /api/xiangqi/withdraw/query`
- `POST /api/xiangqi/withdraw/notify`

### 6.3 房间

- `POST /api/xiangqi/rooms/create`
- `POST /api/xiangqi/rooms/join`
- `POST /api/xiangqi/rooms/cancel`
- `GET /api/xiangqi/rooms/:roomCode`
- `GET /api/xiangqi/rooms/:roomCode/events`

### 6.4 对局

- `GET /api/xiangqi/matches/:id`
- `POST /api/xiangqi/matches/:id/move`
- `POST /api/xiangqi/matches/:id/resign`
- `POST /api/xiangqi/matches/:id/draw/offer`
- `POST /api/xiangqi/matches/:id/draw/respond`
- `POST /api/xiangqi/matches/:id/tick`

## 7. 钱包结算规则

### 7.1 充值成功

- `available_balance += amount`
- 写入 `deposit_success`

### 7.2 创建房间

- 检查 `available_balance >= stake`
- `available_balance -= stake`
- `frozen_balance += stake`
- 写入 `freeze_stake`

### 7.3 加入房间

- 同创建房间逻辑

### 7.4 胜者结算

若 A 获胜，B 失败：

- A：
  - `frozen_balance -= stake`
  - `available_balance += stake + stake`
  - 写入 `match_win`
- B：
  - `frozen_balance -= stake`
  - 写入 `match_loss`

### 7.5 和棋或超时

双方：

- `frozen_balance -= stake`
- `available_balance += stake`
- 写入 `unfreeze_stake`

### 7.6 开局前取消

- 所有已冻结 stake 全额退回

## 8. 对局规则

第一阶段规则：

- 仅支持 1v1 实时对战
- 局时仅支持 `10 / 15 / 30` 分钟
- 超时按和棋结算
- 认输直接判负
- 求和需双方同意
- 前端不负责决定合法性和胜负
- 服务端负责走法校验、局面推进与结果判定

## 9. 异常与风控

必须包含以下保护：

- stake 最小值与最大值限制
- 单用户同一时刻只能在一个活跃房间/对局中
- 充值通知验签
- 提现通知验签
- 所有资金变更使用数据库事务
- 所有支付/提现/结算必须幂等
- 掉线时不立即判负
- 超时最终按和棋结算
- 服务重启后能够恢复房间和局面

## 10. 第一阶段不做

为保证首版可落地，以下内容暂不进入第一阶段：

- 观战
- 聊天
- 排行榜
- 战绩系统
- 多种棋盘皮肤切换
- AI 对战
- 多币种支持
- 后台人工仲裁页面

## 11. 实现顺序建议

### 阶段 1

- 数据表和钱包账本
- Nexa 充值/提现闭环
- 中国象棋页面静态 UI

### 阶段 2

- 房间创建/加入/取消
- stake 冻结与解冻

### 阶段 3

- 对局引擎
- SSE 房间事件
- 走子广播

### 阶段 4

- 认输/求和/超时和结算
- 资金流水联动

### 阶段 5

- 回归测试
- 风控边界测试
- UI 打磨
