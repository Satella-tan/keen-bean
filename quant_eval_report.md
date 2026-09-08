# Embedding Precision Benchmark Report (FP32 vs FP16 vs INT8)

- **Model:** `BAAI/bge-small-en-v1.5`
- **Total Vectors:** 5305
- **Dimensions:** 384
- **Queries Evaluated:** 13

## 1. Executive Summary & Accuracy Retention

| Format | RAM Vector Buffer | Disk File Size | Disk Reduction | Top-1 Recall (Agreement) | Top-3 Recall | Avg Score Difference (\Delta) |
|---|---|---|---|---|---|---|
| **FP32** (JSON) | `7957.50 KB` (100%) | `27494.51 KB` | 0.0% (Baseline) | **100.0%** | **100.0%** | `0.0000` |
| **FP16** (JSON) | `3978.75 KB` (50.0%) | `28661.06 KB` | -4.2% | **100.0%** | **100.0%** | `0.0000` |
| **INT8** (Binary .bin) | `2010.10 KB` (25.3%) | `4651.08 KB` | **83.1% savings** | **100.0%** | **100.0%** | `0.0005` |

---

## 2. Side-by-Side Query Comparison (Rank #1 Matches)

| # | Query | FP32 (Time & Score) | FP16 (Time & Score) | INT8 (Time & Score) | Agreement | YouTube Link |
|---|---|---|---|---|---|---|
| 1 | **How to manage big eating crashouts?** | `[82:22]` (0.7508) | `[82:22]` (0.7508) | `[82:22]` (0.7512) | 🎯 All Match | [82:22](https://youtu.be/dJy-YOsvRr4?t=4942) |
| 2 | **Forearm training** | `[03:41]` (0.7883) | `[03:41]` (0.7883) | `[03:41]` (0.7883) | 🎯 All Match | [03:41](https://youtu.be/qjcCsgklfH4?t=221) |
| 3 | **Best rep range** | `[14:06]` (0.8608) | `[14:06]` (0.8608) | `[14:06]` (0.8614) | 🎯 All Match | [14:06](https://youtu.be/jXFrXRZyQaw?t=846) |
| 4 | **Progression session to session** | `[24:33]` (0.7956) | `[24:33]` (0.7956) | `[24:33]` (0.7949) | 🎯 All Match | [24:33](https://youtu.be/iRZ7VQtLV7U?t=1473) |
| 5 | **Reps in reserve tips** | `[52:29]` (0.8216) | `[52:29]` (0.8216) | `[52:29]` (0.8219) | 🎯 All Match | [52:29](https://youtu.be/fePVec2M1?t=3149) |
| 6 | **single arm kelso shrugs** | `[35:23]` (0.8309) | `[35:23]` (0.8309) | `[35:23]` (0.8314) | 🎯 All Match | [35:23](https://youtu.be/jXFrXRZyQaw?t=2123) |
| 7 | **how to brace properly** | `[37:23]` (0.7630) | `[37:23]` (0.7630) | `[37:23]` (0.7630) | 🎯 All Match | [37:23](https://youtu.be/FO674E7efYg?t=2243) |
| 8 | **methylene blue** | `[23:22]` (0.8010) | `[23:22]` (0.8010) | `[23:22]` (0.7999) | 🎯 All Match | [23:22](https://youtu.be/1OpIBRM9cps?t=1402) |
| 9 | **do we need to worry about metabolic adaptation on a cut?** | `[31:49]` (0.8190) | `[31:49]` (0.8190) | `[31:49]` (0.8184) | 🎯 All Match | [31:49](https://youtu.be/noX?t=1909) |
| 10 | **vegetable glycerin** | `[55:08]` (0.7965) | `[55:08]` (0.7965) | `[55:08]` (0.7970) | 🎯 All Match | [55:08](https://youtu.be/noX?t=3308) |
| 11 | **How important is having a straight elbow when doing forearm work** | `[49:48]` (0.8154) | `[49:48]` (0.8154) | `[49:48]` (0.8142) | 🎯 All Match | [49:48](https://youtu.be/5ga7mWecyLY?t=2988) |
| 12 | **should i keep my post workout meal lower fat and higher carb** | `[53:23]` (0.7822) | `[53:23]` (0.7822) | `[53:23]` (0.7821) | 🎯 All Match | [53:23](https://youtu.be/qjcCsgklfH4?t=3203) |
| 13 | **vegetable Glycerine** | `[55:08]` (0.7952) | `[55:08]` (0.7952) | `[55:08]` (0.7955) | 🎯 All Match | [55:08](https://youtu.be/noX?t=3308) |

---

## 3. Query Deep Dive (Top 3 Results per Precision Format)

### Query 1: "How to manage big eating crashouts?"

| Rank | Precision | Time | Hybrid Score | Semantic | Keyword | Matched Quote | Link |
|---|---|---|---|---|---|---|---|
| #1 | `FP32` | 82:22 | `0.7508` | `0.6440` | `1.0000` | you talking? Yeah. Short-term feeding. It's not a big dea... | [Watch](https://youtu.be/dJy-YOsvRr4?t=4942) |
| #2 | `FP32` | 40:32 | `0.7004` | `0.6368` | `0.8487` | So, again, what you want to do is you want to manage the ... | [Watch](https://youtu.be/iRZ7VQtLV7U?t=2432) |
| #3 | `FP32` | 40:08 | `0.6644` | `0.6074` | `0.7973` | And then to make it even better is take those 2,000 or 1,... | [Watch](https://youtu.be/iRZ7VQtLV7U?t=2408) |
| #1 | `FP16` | 82:22 | `0.7508` | `0.6440` | `1.0000` | you talking? Yeah. Short-term feeding. It's not a big dea... | [Watch](https://youtu.be/dJy-YOsvRr4?t=4942) |
| #2 | `FP16` | 40:32 | `0.7004` | `0.6368` | `0.8487` | So, again, what you want to do is you want to manage the ... | [Watch](https://youtu.be/iRZ7VQtLV7U?t=2432) |
| #3 | `FP16` | 40:08 | `0.6644` | `0.6074` | `0.7973` | And then to make it even better is take those 2,000 or 1,... | [Watch](https://youtu.be/iRZ7VQtLV7U?t=2408) |
| #1 | `INT8` | 82:22 | `0.7512` | `0.6446` | `1.0000` | you talking? Yeah. Short-term feeding. It's not a big dea... | [Watch](https://youtu.be/dJy-YOsvRr4?t=4942) |
| #2 | `INT8` | 40:32 | `0.6989` | `0.6347` | `0.8487` | So, again, what you want to do is you want to manage the ... | [Watch](https://youtu.be/iRZ7VQtLV7U?t=2432) |
| #3 | `INT8` | 40:08 | `0.6641` | `0.6070` | `0.7973` | And then to make it even better is take those 2,000 or 1,... | [Watch](https://youtu.be/iRZ7VQtLV7U?t=2408) |

---

### Query 2: "Forearm training"

| Rank | Precision | Time | Hybrid Score | Semantic | Keyword | Matched Quote | Link |
|---|---|---|---|---|---|---|---|
| #1 | `FP32` | 03:41 | `0.7883` | `0.6975` | `1.0000` | I don't believe that you should train abs. I think that i... | [Watch](https://youtu.be/qjcCsgklfH4?t=221) |
| #2 | `FP32` | 52:21 | `0.7622` | `0.7314` | `0.8342` | Does this take the box? Probably not. The reason why is b... | [Watch](https://youtu.be/FO674E7efYg?t=3141) |
| #3 | `FP32` | 52:41 | `0.7606` | `0.7444` | `0.7985` | Training the fibers that supenate the uh the forearm or t... | [Watch](https://youtu.be/FO674E7efYg?t=3161) |
| #1 | `FP16` | 03:41 | `0.7883` | `0.6975` | `1.0000` | I don't believe that you should train abs. I think that i... | [Watch](https://youtu.be/qjcCsgklfH4?t=221) |
| #2 | `FP16` | 52:21 | `0.7622` | `0.7314` | `0.8342` | Does this take the box? Probably not. The reason why is b... | [Watch](https://youtu.be/FO674E7efYg?t=3141) |
| #3 | `FP16` | 52:41 | `0.7606` | `0.7444` | `0.7985` | Training the fibers that supenate the uh the forearm or t... | [Watch](https://youtu.be/FO674E7efYg?t=3161) |
| #1 | `INT8` | 03:41 | `0.7883` | `0.6975` | `1.0000` | I don't believe that you should train abs. I think that i... | [Watch](https://youtu.be/qjcCsgklfH4?t=221) |
| #2 | `INT8` | 52:21 | `0.7620` | `0.7310` | `0.8342` | Does this take the box? Probably not. The reason why is b... | [Watch](https://youtu.be/FO674E7efYg?t=3141) |
| #3 | `INT8` | 52:41 | `0.7608` | `0.7447` | `0.7985` | Training the fibers that supenate the uh the forearm or t... | [Watch](https://youtu.be/FO674E7efYg?t=3161) |

---

### Query 3: "Best rep range"

| Rank | Precision | Time | Hybrid Score | Semantic | Keyword | Matched Quote | Link |
|---|---|---|---|---|---|---|---|
| #1 | `FP32` | 14:06 | `0.8608` | `0.8011` | `1.0000` | So, another thing we'll talk about is rep ranges. So, phy... | [Watch](https://youtu.be/jXFrXRZyQaw?t=846) |
| #2 | `FP32` | 14:09 | `0.8583` | `0.8128` | `0.9644` | So, physiologically speaking, like I mentioned in uh plen... | [Watch](https://youtu.be/jXFrXRZyQaw?t=849) |
| #3 | `FP32` | 59:37 | `0.7727` | `0.7347` | `0.8615` | We want to train with zero to two R because that's going ... | [Watch](https://youtu.be/SGZjjt4lXyA?t=3577) |
| #1 | `FP16` | 14:06 | `0.8608` | `0.8011` | `1.0000` | So, another thing we'll talk about is rep ranges. So, phy... | [Watch](https://youtu.be/jXFrXRZyQaw?t=846) |
| #2 | `FP16` | 14:09 | `0.8583` | `0.8128` | `0.9644` | So, physiologically speaking, like I mentioned in uh plen... | [Watch](https://youtu.be/jXFrXRZyQaw?t=849) |
| #3 | `FP16` | 59:37 | `0.7728` | `0.7347` | `0.8615` | We want to train with zero to two R because that's going ... | [Watch](https://youtu.be/SGZjjt4lXyA?t=3577) |
| #1 | `INT8` | 14:06 | `0.8614` | `0.8021` | `1.0000` | So, another thing we'll talk about is rep ranges. So, phy... | [Watch](https://youtu.be/jXFrXRZyQaw?t=846) |
| #2 | `INT8` | 14:09 | `0.8579` | `0.8123` | `0.9644` | So, physiologically speaking, like I mentioned in uh plen... | [Watch](https://youtu.be/jXFrXRZyQaw?t=849) |
| #3 | `INT8` | 59:37 | `0.7721` | `0.7337` | `0.8615` | We want to train with zero to two R because that's going ... | [Watch](https://youtu.be/SGZjjt4lXyA?t=3577) |

---

### Query 4: "Progression session to session"

| Rank | Precision | Time | Hybrid Score | Semantic | Keyword | Matched Quote | Link |
|---|---|---|---|---|---|---|---|
| #1 | `FP32` | 24:33 | `0.7956` | `0.7080` | `1.0000` | Because your individual progression, your day-to-day prog... | [Watch](https://youtu.be/iRZ7VQtLV7U?t=1473) |
| #2 | `FP32` | 31:05 | `0.7643` | `0.7174` | `0.8737` | For just general advice, I recommend sticking to a double... | [Watch](https://youtu.be/5vm2Ani1fzA?t=1865) |
| #3 | `FP32` | 29:02 | `0.7589` | `0.6949` | `0.9081` | So it's pretty much just holding you back from increasing... | [Watch](https://youtu.be/5vm2Ani1fzA?t=1742) |
| #1 | `FP16` | 24:33 | `0.7956` | `0.7080` | `1.0000` | Because your individual progression, your day-to-day prog... | [Watch](https://youtu.be/iRZ7VQtLV7U?t=1473) |
| #2 | `FP16` | 31:05 | `0.7642` | `0.7173` | `0.8737` | For just general advice, I recommend sticking to a double... | [Watch](https://youtu.be/5vm2Ani1fzA?t=1865) |
| #3 | `FP16` | 29:02 | `0.7589` | `0.6949` | `0.9081` | So it's pretty much just holding you back from increasing... | [Watch](https://youtu.be/5vm2Ani1fzA?t=1742) |
| #1 | `INT8` | 24:33 | `0.7949` | `0.7070` | `1.0000` | Because your individual progression, your day-to-day prog... | [Watch](https://youtu.be/iRZ7VQtLV7U?t=1473) |
| #2 | `INT8` | 31:05 | `0.7650` | `0.7184` | `0.8737` | For just general advice, I recommend sticking to a double... | [Watch](https://youtu.be/5vm2Ani1fzA?t=1865) |
| #3 | `INT8` | 29:02 | `0.7589` | `0.6950` | `0.9081` | So it's pretty much just holding you back from increasing... | [Watch](https://youtu.be/5vm2Ani1fzA?t=1742) |

---

### Query 5: "Reps in reserve tips"

| Rank | Precision | Time | Hybrid Score | Semantic | Keyword | Matched Quote | Link |
|---|---|---|---|---|---|---|---|
| #1 | `FP32` | 52:29 | `0.8216` | `0.7452` | `1.0000` | I'm not going to lie. Now, this was a grinder. This was a... | [Watch](https://youtu.be/fePVec2M1?t=3149) |
| #2 | `FP32` | 30:15 | `0.7805` | `0.7678` | `0.8103` | Sub five by the way, and utilizing multiple reps in reser... | [Watch](https://youtu.be/FO674E7efYg?t=1815) |
| #3 | `FP32` | 17:31 | `0.7664` | `0.6888` | `0.9475` | The advanced natural bodybuilders, specifically the ones ... | [Watch](https://youtu.be/5ga7mWecyLY?t=1051) |
| #1 | `FP16` | 52:29 | `0.8216` | `0.7452` | `1.0000` | I'm not going to lie. Now, this was a grinder. This was a... | [Watch](https://youtu.be/fePVec2M1?t=3149) |
| #2 | `FP16` | 30:15 | `0.7805` | `0.7678` | `0.8103` | Sub five by the way, and utilizing multiple reps in reser... | [Watch](https://youtu.be/FO674E7efYg?t=1815) |
| #3 | `FP16` | 17:31 | `0.7664` | `0.6888` | `0.9475` | The advanced natural bodybuilders, specifically the ones ... | [Watch](https://youtu.be/5ga7mWecyLY?t=1051) |
| #1 | `INT8` | 52:29 | `0.8219` | `0.7455` | `1.0000` | I'm not going to lie. Now, this was a grinder. This was a... | [Watch](https://youtu.be/fePVec2M1?t=3149) |
| #2 | `INT8` | 30:15 | `0.7801` | `0.7672` | `0.8103` | Sub five by the way, and utilizing multiple reps in reser... | [Watch](https://youtu.be/FO674E7efYg?t=1815) |
| #3 | `INT8` | 17:31 | `0.7662` | `0.6886` | `0.9475` | The advanced natural bodybuilders, specifically the ones ... | [Watch](https://youtu.be/5ga7mWecyLY?t=1051) |

---

### Query 6: "single arm kelso shrugs"

| Rank | Precision | Time | Hybrid Score | Semantic | Keyword | Matched Quote | Link |
|---|---|---|---|---|---|---|---|
| #1 | `FP32` | 35:23 | `0.8309` | `0.7584` | `1.0000` | I know you guys can relate with the Kelso shrugs because ... | [Watch](https://youtu.be/jXFrXRZyQaw?t=2123) |
| #2 | `FP32` | 35:20 | `0.8094` | `0.7400` | `0.9715` | It just feels a lot better, right? I know you guys can re... | [Watch](https://youtu.be/jXFrXRZyQaw?t=2120) |
| #3 | `FP32` | 41:26 | `0.7287` | `0.7021` | `0.7909` | I think I got six reps. I I wrote a note down in my train... | [Watch](https://youtu.be/VgFvhYX5Xnk?t=2486) |
| #1 | `FP16` | 35:23 | `0.8309` | `0.7584` | `1.0000` | I know you guys can relate with the Kelso shrugs because ... | [Watch](https://youtu.be/jXFrXRZyQaw?t=2123) |
| #2 | `FP16` | 35:20 | `0.8094` | `0.7400` | `0.9715` | It just feels a lot better, right? I know you guys can re... | [Watch](https://youtu.be/jXFrXRZyQaw?t=2120) |
| #3 | `FP16` | 41:26 | `0.7287` | `0.7021` | `0.7909` | I think I got six reps. I I wrote a note down in my train... | [Watch](https://youtu.be/VgFvhYX5Xnk?t=2486) |
| #1 | `INT8` | 35:23 | `0.8314` | `0.7591` | `1.0000` | I know you guys can relate with the Kelso shrugs because ... | [Watch](https://youtu.be/jXFrXRZyQaw?t=2123) |
| #2 | `INT8` | 35:20 | `0.8086` | `0.7388` | `0.9715` | It just feels a lot better, right? I know you guys can re... | [Watch](https://youtu.be/jXFrXRZyQaw?t=2120) |
| #3 | `INT8` | 41:26 | `0.7290` | `0.7025` | `0.7909` | I think I got six reps. I I wrote a note down in my train... | [Watch](https://youtu.be/VgFvhYX5Xnk?t=2486) |

---

### Query 7: "how to brace properly"

| Rank | Precision | Time | Hybrid Score | Semantic | Keyword | Matched Quote | Link |
|---|---|---|---|---|---|---|---|
| #1 | `FP32` | 37:23 | `0.7630` | `0.6614` | `1.0000` | No. You literally just set up the cable so that it pulls ... | [Watch](https://youtu.be/FO674E7efYg?t=2243) |
| #2 | `FP32` | 23:35 | `0.6576` | `0.6373` | `0.7051` | So, you just need to relax. Like, a lot of people are not... | [Watch](https://youtu.be/GluEoCSP9Z0?t=1415) |
| #3 | `FP32` | 31:35 | `0.6554` | `0.5782` | `0.8355` | uh session to session even if you're doing everything pro... | [Watch](https://youtu.be/5vm2Ani1fzA?t=1895) |
| #1 | `FP16` | 37:23 | `0.7630` | `0.6614` | `1.0000` | No. You literally just set up the cable so that it pulls ... | [Watch](https://youtu.be/FO674E7efYg?t=2243) |
| #2 | `FP16` | 23:35 | `0.6576` | `0.6373` | `0.7051` | So, you just need to relax. Like, a lot of people are not... | [Watch](https://youtu.be/GluEoCSP9Z0?t=1415) |
| #3 | `FP16` | 31:35 | `0.6554` | `0.5783` | `0.8355` | uh session to session even if you're doing everything pro... | [Watch](https://youtu.be/5vm2Ani1fzA?t=1895) |
| #1 | `INT8` | 37:23 | `0.7630` | `0.6615` | `1.0000` | No. You literally just set up the cable so that it pulls ... | [Watch](https://youtu.be/FO674E7efYg?t=2243) |
| #2 | `INT8` | 31:35 | `0.6571` | `0.5807` | `0.8355` | uh session to session even if you're doing everything pro... | [Watch](https://youtu.be/5vm2Ani1fzA?t=1895) |
| #3 | `INT8` | 23:35 | `0.6561` | `0.6351` | `0.7051` | So, you just need to relax. Like, a lot of people are not... | [Watch](https://youtu.be/GluEoCSP9Z0?t=1415) |

---

### Query 8: "methylene blue"

| Rank | Precision | Time | Hybrid Score | Semantic | Keyword | Matched Quote | Link |
|---|---|---|---|---|---|---|---|
| #1 | `FP32` | 23:22 | `0.8010` | `0.7157` | `1.0000` | Starbucks caramel, I think. Oh, delicious. We're going to... | [Watch](https://youtu.be/1OpIBRM9cps?t=1402) |
| #2 | `FP32` | 00:11 | `0.6593` | `0.6106` | `0.7729` | It's beautiful. Look at this. Oh. Oh, it's actually so ni... | [Watch](https://youtu.be/noX?t=11) |
| #3 | `FP32` | 00:00 | `0.6101` | `0.5283` | `0.8012` | I'm a chud. Don't you forget it. Oh, it's blue skies. It'... | [Watch](https://youtu.be/FO674E7efYg?t=0) |
| #1 | `FP16` | 23:22 | `0.8010` | `0.7157` | `1.0000` | Starbucks caramel, I think. Oh, delicious. We're going to... | [Watch](https://youtu.be/1OpIBRM9cps?t=1402) |
| #2 | `FP16` | 00:11 | `0.6593` | `0.6106` | `0.7729` | It's beautiful. Look at this. Oh. Oh, it's actually so ni... | [Watch](https://youtu.be/noX?t=11) |
| #3 | `FP16` | 00:00 | `0.6101` | `0.5282` | `0.8012` | I'm a chud. Don't you forget it. Oh, it's blue skies. It'... | [Watch](https://youtu.be/FO674E7efYg?t=0) |
| #1 | `INT8` | 23:22 | `0.7999` | `0.7141` | `1.0000` | Starbucks caramel, I think. Oh, delicious. We're going to... | [Watch](https://youtu.be/1OpIBRM9cps?t=1402) |
| #2 | `INT8` | 00:11 | `0.6595` | `0.6108` | `0.7729` | It's beautiful. Look at this. Oh. Oh, it's actually so ni... | [Watch](https://youtu.be/noX?t=11) |
| #3 | `INT8` | 00:00 | `0.6101` | `0.5283` | `0.8012` | I'm a chud. Don't you forget it. Oh, it's blue skies. It'... | [Watch](https://youtu.be/FO674E7efYg?t=0) |

---

### Query 9: "do we need to worry about metabolic adaptation on a cut?"

| Rank | Precision | Time | Hybrid Score | Semantic | Keyword | Matched Quote | Link |
|---|---|---|---|---|---|---|---|
| #1 | `FP32` | 31:49 | `0.8190` | `0.7415` | `1.0000` | Holy messy. Wow. I feel like that was weak by the uh by t... | [Watch](https://youtu.be/noX?t=1909) |
| #2 | `FP32` | 16:40 | `0.7250` | `0.7364` | `0.6983` | If you've been dieting for a while or you're someone that... | [Watch](https://youtu.be/5vm2Ani1fzA?t=1000) |
| #3 | `FP32` | 22:52 | `0.7104` | `0.7011` | `0.7321` | So that's just a metabolic adaptation. Um, and then yeah,... | [Watch](https://youtu.be/Qjya3fPEw0Y?t=1372) |
| #1 | `FP16` | 31:49 | `0.8190` | `0.7415` | `1.0000` | Holy messy. Wow. I feel like that was weak by the uh by t... | [Watch](https://youtu.be/noX?t=1909) |
| #2 | `FP16` | 16:40 | `0.7250` | `0.7364` | `0.6983` | If you've been dieting for a while or you're someone that... | [Watch](https://youtu.be/5vm2Ani1fzA?t=1000) |
| #3 | `FP16` | 22:52 | `0.7104` | `0.7011` | `0.7321` | So that's just a metabolic adaptation. Um, and then yeah,... | [Watch](https://youtu.be/Qjya3fPEw0Y?t=1372) |
| #1 | `INT8` | 31:49 | `0.8184` | `0.7405` | `1.0000` | Holy messy. Wow. I feel like that was weak by the uh by t... | [Watch](https://youtu.be/noX?t=1909) |
| #2 | `INT8` | 16:40 | `0.7251` | `0.7365` | `0.6983` | If you've been dieting for a while or you're someone that... | [Watch](https://youtu.be/5vm2Ani1fzA?t=1000) |
| #3 | `INT8` | 22:52 | `0.7104` | `0.7012` | `0.7321` | So that's just a metabolic adaptation. Um, and then yeah,... | [Watch](https://youtu.be/Qjya3fPEw0Y?t=1372) |

---

### Query 10: "vegetable glycerin"

| Rank | Precision | Time | Hybrid Score | Semantic | Keyword | Matched Quote | Link |
|---|---|---|---|---|---|---|---|
| #1 | `FP32` | 55:08 | `0.7965` | `0.7093` | `1.0000` | Um that's a solid five right there. So, water chestnuts, ... | [Watch](https://youtu.be/noX?t=3308) |
| #2 | `FP32` | 02:32 | `0.7472` | `0.6756` | `0.9143` | So I just walked every single aisle. I got about 5k steps... | [Watch](https://youtu.be/GluEoCSP9Z0?t=152) |
| #3 | `FP32` | 35:34 | `0.7469` | `0.6751` | `0.9143` | Sometimes you want some some little spice, but it's 2026.... | [Watch](https://youtu.be/noX?t=2134) |
| #1 | `FP16` | 55:08 | `0.7965` | `0.7093` | `1.0000` | Um that's a solid five right there. So, water chestnuts, ... | [Watch](https://youtu.be/noX?t=3308) |
| #2 | `FP16` | 02:32 | `0.7472` | `0.6756` | `0.9143` | So I just walked every single aisle. I got about 5k steps... | [Watch](https://youtu.be/GluEoCSP9Z0?t=152) |
| #3 | `FP16` | 35:34 | `0.7469` | `0.6751` | `0.9143` | Sometimes you want some some little spice, but it's 2026.... | [Watch](https://youtu.be/noX?t=2134) |
| #1 | `INT8` | 55:08 | `0.7970` | `0.7099` | `1.0000` | Um that's a solid five right there. So, water chestnuts, ... | [Watch](https://youtu.be/noX?t=3308) |
| #2 | `INT8` | 35:34 | `0.7475` | `0.6759` | `0.9143` | Sometimes you want some some little spice, but it's 2026.... | [Watch](https://youtu.be/noX?t=2134) |
| #3 | `INT8` | 02:32 | `0.7470` | `0.6753` | `0.9143` | So I just walked every single aisle. I got about 5k steps... | [Watch](https://youtu.be/GluEoCSP9Z0?t=152) |

---

### Query 11: "How important is having a straight elbow when doing forearm work"

| Rank | Precision | Time | Hybrid Score | Semantic | Keyword | Matched Quote | Link |
|---|---|---|---|---|---|---|---|
| #1 | `FP32` | 49:48 | `0.8154` | `0.7362` | `1.0000` | You're not going to limit the tricep long head unless you... | [Watch](https://youtu.be/5ga7mWecyLY?t=2988) |
| #2 | `FP32` | 52:21 | `0.7605` | `0.7061` | `0.8875` | Does this take the box? Probably not. The reason why is b... | [Watch](https://youtu.be/FO674E7efYg?t=3141) |
| #3 | `FP32` | 42:56 | `0.7487` | `0.6999` | `0.8624` | That was honestly that was one because with dumbbell pull... | [Watch](https://youtu.be/yMJiReG-Wek?t=2576) |
| #1 | `FP16` | 49:48 | `0.8154` | `0.7362` | `1.0000` | You're not going to limit the tricep long head unless you... | [Watch](https://youtu.be/5ga7mWecyLY?t=2988) |
| #2 | `FP16` | 52:21 | `0.7605` | `0.7061` | `0.8875` | Does this take the box? Probably not. The reason why is b... | [Watch](https://youtu.be/FO674E7efYg?t=3141) |
| #3 | `FP16` | 42:56 | `0.7487` | `0.7000` | `0.8624` | That was honestly that was one because with dumbbell pull... | [Watch](https://youtu.be/yMJiReG-Wek?t=2576) |
| #1 | `INT8` | 49:48 | `0.8142` | `0.7346` | `1.0000` | You're not going to limit the tricep long head unless you... | [Watch](https://youtu.be/5ga7mWecyLY?t=2988) |
| #2 | `INT8` | 52:21 | `0.7606` | `0.7061` | `0.8875` | Does this take the box? Probably not. The reason why is b... | [Watch](https://youtu.be/FO674E7efYg?t=3141) |
| #3 | `INT8` | 42:56 | `0.7475` | `0.6982` | `0.8624` | That was honestly that was one because with dumbbell pull... | [Watch](https://youtu.be/yMJiReG-Wek?t=2576) |

---

### Query 12: "should i keep my post workout meal lower fat and higher carb"

| Rank | Precision | Time | Hybrid Score | Semantic | Keyword | Matched Quote | Link |
|---|---|---|---|---|---|---|---|
| #1 | `FP32` | 53:23 | `0.7822` | `0.6888` | `1.0000` | Um but that's why it's less weight. But don't don't be de... | [Watch](https://youtu.be/qjcCsgklfH4?t=3203) |
| #2 | `FP32` | 63:35 | `0.7792` | `0.7599` | `0.8243` | Um, and yeah, I'm going to go get some coffee. I'm probab... | [Watch](https://youtu.be/dJy-YOsvRr4?t=3815) |
| #3 | `FP32` | 58:32 | `0.7758` | `0.7856` | `0.7532` | Um, so I'm going to answer this here as well. Someone sai... | [Watch](https://youtu.be/GluEoCSP9Z0?t=3512) |
| #1 | `FP16` | 53:23 | `0.7822` | `0.6888` | `1.0000` | Um but that's why it's less weight. But don't don't be de... | [Watch](https://youtu.be/qjcCsgklfH4?t=3203) |
| #2 | `FP16` | 63:35 | `0.7792` | `0.7599` | `0.8243` | Um, and yeah, I'm going to go get some coffee. I'm probab... | [Watch](https://youtu.be/dJy-YOsvRr4?t=3815) |
| #3 | `FP16` | 58:32 | `0.7758` | `0.7856` | `0.7532` | Um, so I'm going to answer this here as well. Someone sai... | [Watch](https://youtu.be/GluEoCSP9Z0?t=3512) |
| #1 | `INT8` | 53:23 | `0.7821` | `0.6888` | `1.0000` | Um but that's why it's less weight. But don't don't be de... | [Watch](https://youtu.be/qjcCsgklfH4?t=3203) |
| #2 | `INT8` | 63:35 | `0.7795` | `0.7602` | `0.8243` | Um, and yeah, I'm going to go get some coffee. I'm probab... | [Watch](https://youtu.be/dJy-YOsvRr4?t=3815) |
| #3 | `INT8` | 58:32 | `0.7754` | `0.7849` | `0.7532` | Um, so I'm going to answer this here as well. Someone sai... | [Watch](https://youtu.be/GluEoCSP9Z0?t=3512) |

---

### Query 13: "vegetable Glycerine"

| Rank | Precision | Time | Hybrid Score | Semantic | Keyword | Matched Quote | Link |
|---|---|---|---|---|---|---|---|
| #1 | `FP32` | 55:08 | `0.7952` | `0.7075` | `1.0000` | Um that's a solid five right there. So, water chestnuts, ... | [Watch](https://youtu.be/noX?t=3308) |
| #2 | `FP32` | 02:32 | `0.7392` | `0.6642` | `0.9143` | So I just walked every single aisle. I got about 5k steps... | [Watch](https://youtu.be/GluEoCSP9Z0?t=152) |
| #3 | `FP32` | 35:34 | `0.7372` | `0.6613` | `0.9143` | Sometimes you want some some little spice, but it's 2026.... | [Watch](https://youtu.be/noX?t=2134) |
| #1 | `FP16` | 55:08 | `0.7952` | `0.7075` | `1.0000` | Um that's a solid five right there. So, water chestnuts, ... | [Watch](https://youtu.be/noX?t=3308) |
| #2 | `FP16` | 02:32 | `0.7392` | `0.6642` | `0.9143` | So I just walked every single aisle. I got about 5k steps... | [Watch](https://youtu.be/GluEoCSP9Z0?t=152) |
| #3 | `FP16` | 35:34 | `0.7372` | `0.6613` | `0.9143` | Sometimes you want some some little spice, but it's 2026.... | [Watch](https://youtu.be/noX?t=2134) |
| #1 | `INT8` | 55:08 | `0.7955` | `0.7079` | `1.0000` | Um that's a solid five right there. So, water chestnuts, ... | [Watch](https://youtu.be/noX?t=3308) |
| #2 | `INT8` | 02:32 | `0.7390` | `0.6639` | `0.9143` | So I just walked every single aisle. I got about 5k steps... | [Watch](https://youtu.be/GluEoCSP9Z0?t=152) |
| #3 | `INT8` | 35:34 | `0.7374` | `0.6616` | `0.9143` | Sometimes you want some some little spice, but it's 2026.... | [Watch](https://youtu.be/noX?t=2134) |

---

