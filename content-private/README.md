# Private content packs

Everything in this folder except this README is git-ignored.

Put content packs here that you can't publish, such as settings based on copyrighted
works, generated locally for personal practice. They use the same layout as `content/`:

```
content-private/sql/<setting-id>/
  setting.yaml
  schema.sql
  seed.sql
  questions.yaml
```

The app and the test suite load them automatically next to the public packs.
