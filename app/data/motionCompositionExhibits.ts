export const motionCompositionExhibits = [
{id:'stagger-motion',title:'Stagger Motion / 時間差の連鎖',tags:['Motion Composition','時間差','順序'],note:'予定時刻とフレームで観測した開始を比べる。',difference:'WAAPI cascadeと異なり、順序・個数・同時/順次の組合せを編集し開始の観測を比較する。'},
{id:'sequence-builder',title:'Sequence Builder / 時間軸を組み立てる',tags:['Motion Composition','時間軸','順序'],note:'移動・回転・拡大・フェードを並べ、任意時点を観察。',difference:'単独WAAPI標本ではなく利用者が編集する直列時間軸を扱う。'},
{id:'flip-layout',title:'FLIP Layout Transition / 配置をつなぐ',tags:['Motion Composition','FLIP','DOM','実測'],note:'変更前後のDOM矩形から反転量を計算する。',difference:'第7期B Expanding Cardの指定寸法補間とは異なり、実DOMのFirst/Last矩形を測定する。'},
{id:'motion-path',title:'Motion Path / 曲線をたどる',tags:['Motion Composition','経路','距離'],note:'経路上の距離と向きを観察する。',difference:'既存の自由運動や飛行と異なり、経路の長さと距離による位置・方向を観察する。'},
{id:'parallel-choreography',title:'Parallel Choreography / 同時進行の演出',tags:['Motion Composition','並行','イージング'],note:'異なる開始時刻と時間をもつ動きを重ねる。',difference:'Sequence Builderの直列順序に対し、独立した時間区間の重なりを比較する。'},
{id:'transition-relay',title:'Transition Relay / 退場から登場へ',tags:['Motion Composition','画面遷移','取消'],note:'退場・配置変更・登場と途中反転を追う。',difference:'Skeleton Revealの教材結果と表示ではなく、二画面の遷移順序と新旧処理の取消を扱う。'},
] as const;
export type MotionCompositionId = typeof motionCompositionExhibits[number]['id'];
