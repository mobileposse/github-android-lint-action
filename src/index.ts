import * as core from '@actions/core'
import * as github from '@actions/github'
import { ChecksUpdateParams, ChecksUpdateParamsOutputAnnotations } from '@octokit/rest'
import * as fs from 'fs'
import * as xml2js from 'xml2js'

const { GITHUB_WORKSPACE } = process.env
const OWNER = github.context.repo.owner
const REPO = github.context.repo.repo
const CHECK_NAME = 'Lint Report'

const getSha = (): string => {
  const pullRequest = github.context.payload.pull_request

  if (!pullRequest) {
    return github.context.sha
  }

  return pullRequest.head.sha
}

const mapSeverityLevel = (severity: string) => {
  if (severity === 'Warning') {
    return 'warning'
  } else {
    return 'failure'
  }
}

/**
 * Wrap text after a specified number of characters. Code adapted from Stackoverflow.
 * https://stackoverflow.com/questions/14484787/wrap-text-in-javascript
 *
 * @param text text to wrap
 * @param limit max number of characters before wrapping
 */
const wrap = (text: string, limit: number) => {
  return text.replace(new RegExp(`(?![^\\n]{1,${limit}}$)([^\\n]{1,${limit}})\\s`, 'g'), '$1\n')
}

const processReport = async (filename: string): Promise<Partial<ChecksUpdateParams>> => {
  const annotations: ChecksUpdateParamsOutputAnnotations[] = []

  const contents = fs.readFileSync(filename, 'utf8')
  const parser = new xml2js.Parser()
  const result = await parser.parseStringPromise(contents)

  for (const issue of result.issues.issue) {
    const data = issue.$

    for (const entry of issue.location) {
      const location = entry.$
      const start_line = parseInt(location.line)

      /**
       * Some warnings do not have line numbers (ex. warning related to image files.)
       * We'll skip these since Github annotations requires line numbers
       */
      if (isNaN(start_line)) {
        console.log(`skipping issue: ${data.summary}`)
        continue
      }

      const annotation: ChecksUpdateParamsOutputAnnotations = {
        path: location.file.replace(`${GITHUB_WORKSPACE}/`, ''),
        start_line: parseInt(location.line),
        end_line: parseInt(location.line),
        title: data.summary,
        annotation_level: mapSeverityLevel(data.severity),
        message: wrap(data.message, 80),
        raw_details: wrap(data.explanation, 80)
      }

      console.log(annotation)

      if (annotations.length < 50) {
        annotations.push(annotation)
      }
    }

    if (annotations.length == 50) {
      break
    }
  }

  const issueCount = annotations.length

  return {
    conclusion: issueCount === 0 ? 'success' : 'failure',
    output: {
      title: CHECK_NAME,
      summary: `${issueCount} error(s) found`,
      annotations
    }
  }
}

async function run(): Promise<void> {
  const token = core.getInput('repo_token', { required: true })

  try {
    const oktokit = new github.GitHub(token)
    core.debug('Creating check report')

    const {
      data: { id: checkId }
    } = await oktokit.checks.create({
      owner: OWNER,
      repo: REPO,
      started_at: new Date().toISOString(),
      head_sha: getSha(),
      status: 'in_progress',
      name: CHECK_NAME
    })

    const filename = core.getInput('filename', { required: true })
    const payload = await processReport(filename)
    console.log(payload)
    await oktokit.checks.update({
      owner: OWNER,
      repo: REPO,
      completed_at: new Date().toISOString(),
      status: 'completed',
      check_run_id: checkId,
      ...payload
    })
  } catch (err) {
    core.setFailed(err.message ? err.message : 'Error linting files.')
  }
}

run()
