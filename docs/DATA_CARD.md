# Data and model card

## Dataset

- Training file: `ml/data/dataset1.csv` (18,388 rows, 37 columns before cleaning).
- The `source` column identifies Krisha.kz; `parsed_at` spans 2026-01-03 through 2026-01-06.
- Targets: `price_local`, the listing asking price in KZT. No evidence of completed transaction prices.
- District labels and coordinates indicate a predominantly Astana dataset, despite other city CSV files in the repository.
- The original repository did not include the scraper, collection protocol or a dataset license. This project does not assert independent verification of those details or grant rights to third-party data.
- Root-level `almaty_apartments_with_id.csv` and `krisha_100.csv` are retained as original supplementary files; they are not used by this training workflow.

## Cleaning and feature contract

The approximate Astana rectangle is latitude 50.9–51.35 and longitude 71.1–71.8. This can exclude valid outskirts and include properties outside city boundaries. Deduplication uses listing ID. Keep prices from 1m to 300m KZT, area 15–300 m², 1–13 rooms and construction years 1900–2026. Exclude inconsistent floor/total-floor rows. Invalid optional measurements become missing; numeric medians are fitted inside the training pipeline. Unknown categories receive the explicit `unknown` label.

Nine features: area, rooms, floor, total floors, ceiling height, year built, house type, condition, district. Year built replaces the old `2025 - year_built` calculation. This version excludes future construction years and is not intended to value planned buildings.

## Evaluation

Group by stripped, case-folded residential-complex name. If absent, use district + address (listing ID only when both complex and usable address are unavailable). Group labels are heuristic: spelling variants or inconsistent names can still place related properties in different partitions. No claim of perfectly unique physical properties is made.

Use `GroupShuffleSplit` with fixed seeds 42/43. Allocate 20% of groups to test, then 20% of the remaining groups to validation. Evaluate median baseline, Random Forest and Extra Trees on validation MAE. Select the lowest-MAE candidate; refit it on train+validation. Test is not used for selection or final fitting. Save this exact evaluated artifact.

`ml/reports/metrics.json` records row counts, versions, validation/test metrics and SHA-256 of the input CSV. Results depend on these settings and the dependency environment. Do not compare the new grouped metrics directly with the old random-row split.

## Intended use and limitations

Educational demonstration of a tabular ML system integrated into a web application. A January 2026 snapshot is not a live price feed. The model has no forward-year prediction, economic/news inputs, temporal holdout, calibrated intervals or evaluation on other cities. Luxury-property errors are considerably larger; consult the price-band report. No automatic scraping or dataset refresh is performed.

Before expanding the project, document the collection process and permitted reuse, verify physical-property identifiers, obtain later snapshots, and evaluate by time, district and price segment.
