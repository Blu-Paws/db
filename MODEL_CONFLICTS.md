# Model Conflicts

The following model files had different definitions across handlers and were merged permissively for the shared package.

## Files With Conflicting Definitions

- clinic.model.json
- evisit_details_history.model.json
- evisit_details_notes.model.json
- evisit_details.model.json
- feedback.model.json
- images.model.json
- login.model.json
- payment_details.model.json
- provider_subscriptions.model.json

## Field Type Conflicts

- clinic.model.json.zip_code: number, string -> string
- payment_details.model.json.payment_id: string, number -> string
