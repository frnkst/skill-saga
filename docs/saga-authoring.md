# Saga content authoring

Saga content lives in `content/sagas/<saga-id>/`. A `saga.json` manifest lists
each level in numerical order; files are named `level1.json`, `level2.json`, and
so on without gaps. IDs are permanent, globally unique within a saga, and use
lowercase kebab-case.

## Create content

```sh
npm run saga:new -- --id saga-3 --title "River of Stars" \
  --summary "Return the stars to the river." \
  --audience-note "For ages 7–10." --cover-image "🌟"
npm run level:new -- --saga saga-3 --id river-arrival \
  --title "River Arrival" --date 2026-09-07
npm run sagas:validate
```

`coverImage` is optional and may be an emoji. The level generator adds a valid
starter quest; replace its text and tasks while preserving the hierarchy:
saga → levels → quests → parts → tasks. Every level and every part and quest
has a reward. Rewards contain stars and may add a `fairy`, `unicorn`, `gem`, or
`story-spark` collectible. Dates use `YYYY-MM-DD`.

## Tasks

The six task types are `single-input`, `number-input`, `multiple-choice`
(`presentation` can be `true-false`), `sequence`, `matching`, and
`creative-input`. Objective tasks keep their canonical response in `answer`.
Creative tasks store a response under their `variableKey`. Points must be
non-negative.

Templates support only:

- `{{hero.name}}`
- `{{sidekicks.0}}` (or another zero-based index)
- `{{answers.variable-key}}`

A creative answer is available after its task and remains available throughout
later levels in the same saga. Forward references and duplicate variable keys
are invalid. `interpolatePlainText` returns plain text; render it through normal
React text nodes, which safely escape untrusted values.

## Loading and answer safety

Import `loadSagas`, `loadSaga`, or `loadClientSafeLevel` from
`@/lib/levels/server` only in server code. The module uses Node filesystem APIs
and validates content before returning it. Send `ClientSafeLevel` objects to
the browser; `toClientSafeLevel` removes all canonical answers. Keep
`evaluateTask` in server actions or route handlers so solutions never enter a
client bundle.

Run `npm run sagas:validate` in CI whenever content changes.
