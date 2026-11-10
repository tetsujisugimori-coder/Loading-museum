export const smallMotionExhibits = [
  {id:'bell-bounce', title:'Bell Bounce / 小さな知らせ', tags:['通知','ベル','SVG','Small Motion'], note:'通知・確認・再通知を、支点からの揺れとバッジの出現で伝えます。', difference:'既存WAAPIの通知ベルも揺れを扱いますが、固定振付の標本です。本作はベルの支点・振幅と未読/確認の短い振付を観察します。'},
  {id:'bookmark-fold', title:'Bookmark Fold / 保存の折り目', tags:['保存','変形','SVG','Small Motion'], note:'保存では折り目が開き、解除では細く折り畳まれます。保存はこの展示内の模擬状態です。', difference:'既存Clip Menuは領域の開閉、Flashシェイプ変形は輪郭補間。本作は保存/解除の非対称な折り目と色の変化が主題です。'},
  {id:'squash-stretch', title:'Squash & Stretch / 弾む輪郭', tags:['重力','反発','変形','SVG','Small Motion'], note:'落下、接地のつぶれ、伸び、反発を同じ時間軸で観察。重力と反発は教材用の演出値です。', difference:'Physics Playgroundは物理積分・二体衝突。本作は単球の落下に同期する面積近似のつぶれ/伸びが主題で、物理シミュレーターではありません。'},
  {id:'send-flight', title:'Send Flight / 送信の旅', tags:['送信','ボタン','取消','SVG','Small Motion'], note:'待機から紙飛行機へ折られ、飛び立って完了。途中で取り消せます。実通信は一切行いません。', difference:'既存Async Action Buttonは非同期処理状態。本作はボタンの輪郭から飛行機への折り畳み、飛翔、完了への連続した短い振付です。'},
  {id:'blink-look', title:'Blink & Look / 視線と表情', tags:['視線','まばたき','表情','SVG','Small Motion'], note:'視線はその場から動かず、まぶたと眉で表情を変えます。ポインター/タッチ/矢印キーで視線を操作できます。', difference:'既存watching-eyesにも視線追従、mascot-idleにも瞬きがあります。本作は表情3種・注視位置の固定・瞬き途中の比較を組み合わせたまぶたの観察小品。Cursor Creatureの本体追従/回避は行いません。'},
  {id:'drop-ripple', title:'Drop & Ripple / 一滴の時間', tags:['水滴','波紋','時間分解','SVG','Small Motion'], note:'一滴の落下から接水、輪の拡大、消失までを分解。大きさ・落下速度・波紋の広がりを調整できます。', difference:'既存クリック波紋は入力位置の強調。本作は一滴の大きさ・落下時間・波紋半径を独立に変え、落下と接水の因果を同じ時間軸で観察します。'},
] as const;
export type SmallMotionId = typeof smallMotionExhibits[number]['id'];
