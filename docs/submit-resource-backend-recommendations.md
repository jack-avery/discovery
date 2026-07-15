# Submit Resource — Backend adaptation notes (frontend)

This document records how the public Submit Resource UX adapts its richer logical
submission model to the existing `POST /submissions` backend **without changing
the backend**. It is maintained by the frontend team.

## Logical vs transport model

| Frontend (logical) | Backend (transport) |
|---|---|
| One Submission with up to 5 contributions | One `POST /submissions` **per contribution** |
| One shared contributor profile | Copied onto every request as `submitter_*` |
| Consent checkbox | Frontend gate only — **not persisted** |
| UX types: Existing Resource, My Skills or Services, Event | `submission_type` + temporary `resource_type` inside mappers |

Temporary `resource_type` values (mapper-only, never shown in UI):

| Contribution | `submission_type` | Temporary `resource_type` |
|---|---|---|
| Existing Resource or Service | `new_resource` | `Organization` |
| My Skills or Services | `community_asset` | `Volunteer Skill` |
| Event | `new_resource` | `Program` |

## Fallback mapping (unsupported fields)

Meaningful frontend fields without dedicated backend columns are preserved as
**readable labelled text** (not opaque JSON) in `general_notes` and/or
`submission_message`.

### Shared

| Frontend data | Backend destination |
|---|---|
| Preferred contact method | `submission_message` |
| Contributor name / email / phone | `submitter_name` / `submitter_email` / `submitter_phone` |
| Consent | Not sent |

### Existing Resource or Service

| Frontend data | Backend destination |
|---|---|
| Access mode (physical / online / both) | `general_notes` |
| Online access URL | Website `contacts` row when appropriate + access notes |
| Location name, unit / suite | `general_notes` (“Additional location details”) |
| Hours vary / contact for hours | `general_notes` |
| By-appointment weekdays | `general_notes` (not sent as hour rows) |
| Relationship to resource | `submission_message` |
| More-info URL | `general_notes` |

Public nested aliases used: location `address` / `postal_code`; contact `value`; hour `open_time` / `close_time` with lowercase weekday names.

### My Skills or Services

| Frontend data | Backend destination |
|---|---|
| About the contributor | `general_notes` |
| Why they would like to contribute | `general_notes` |
| Languages | `general_notes` |
| Availability (+ free text) | `general_notes` |
| Who may benefit | `eligibility` (not duplicated in notes when already there) |
| On someone else’s behalf | `submission_message` |

No physical `locations` are invented from free-text neighbourhood notes
(area fields are not currently collected in the UI).

### Event

| Frontend data | Backend destination |
|---|---|
| Schedule (one-time / recurring, times, frequency, end) | `general_notes` (“Event schedule”) |
| Registration mode + instructions | `general_notes` |
| Capacity | `general_notes` |
| Online access | Website contact + notes |
| Location name / unit | `general_notes` |
| Relationship to event | `submission_message` |

## Partial-success strategy

Because each contribution is a separate backend submission:

1. Sequential POSTs are issued in saved order.
2. On **partial** success, successfully accepted contributions are **removed** from
   the local draft; failed ones remain with contributor details and consent.
3. Retry sends only remaining contributions — preventing duplicate moderation
   entries for already-accepted items.
4. On **full** success, localStorage draft is cleared and the success phase is shown.
5. Backend `submission_id` values are retained internally on the result object for
   support/debugging and are **not** shown as a shared reference number.

## Recommended backend follow-ups (not implemented here)

1. Batch or multi-contribution create for one logical Submission.
2. First-class Event resource type and schedule fields.
3. Persist consent and preferred contact method.
4. Richer public location fields (`location_name`, `unit`, `is_virtual`).
5. `GET /submission-metadata` for contribution UX configuration.
6. Safer public validation and clearer rate-limit retry headers.

Do not treat this file as a substitute for implementing those backend capabilities —
it only documents the current frontend adaptation.
