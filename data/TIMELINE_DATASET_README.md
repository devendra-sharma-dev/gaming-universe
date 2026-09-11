# Timeline data contract

`timeline-events.json` is a downloadable MongoDB-ready JSON array. Each event has `title`, `description`, `date` (ISO `YYYY-MM-DD`), `category`, and `popularity` (`high`, `medium`, or `discovery`).

Production acceptance rules: exactly 15,000 events; 1,154 or 1,153 events in each of the 13 categories; one factual one-line description per event; no duplicate title/date pairs; and no date without a verifiable source in the data-production worksheet.

Run validation before importing:

```powershell
node scripts/validate-timeline-dataset.js data/timeline-events.json
node scripts/import-timeline-dataset.js data/timeline-events.json
```

The sample file is intentionally tiny and is for confirming the import schema only. It is not production content. A 15,000-row high-quality factual dataset needs source attribution and editorial review; it should not be fabricated from templates. The game itself reserves 20 events globally each day (5 rounds × 4 cards), which makes 15,000 unique records cover 750 daily games—just over two years.
