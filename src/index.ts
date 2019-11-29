import * as core from '@actions/core'
import * as github from '@actions/github'
import { ChecksUpdateParams, ChecksUpdateParamsOutputAnnotations } from '@octokit/rest'
const { GITHUB_WORKSPACE } = process.env
const OWNER = github.context.repo.owner
const REPO = github.context.repo.repo
const CHECK_NAME = 'Gradle Lint'

const getPrNumber = (): number | undefined => {
  const pullRequest = github.context.payload.pull_request

  if (!pullRequest) {
    return
  }

  return pullRequest.number
}

const getSha = (): string => {
  const pullRequest = github.context.payload.pull_request

  if (!pullRequest) {
    return github.context.sha
  }

  return pullRequest.head.sha
}

const processReport = async (): Promise<Partial<ChecksUpdateParams>> => {
  const annotations: ChecksUpdateParamsOutputAnnotations[] = []

  return {
    conclusion: 'success',
    output: {
      title: CHECK_NAME,
      summary: '0 error(s) found',
      annotations
    }
    // conclusion: errorCount > 0 ? 'failure' : 'success',
    // output: {
    //   title: CHECK_NAME,
    //   summary: `${errorCount} error(s) found`,
    //   annotations
    // }
  }
}

// function processReport(report: CLIEngine.LintReport): Partial<ChecksUpdateParams> {
//   const { errorCount, results } = report
//   const annotations: ChecksUpdateParamsOutputAnnotations[] = []

//   for (const result of results) {
//     const { filePath, messages } = result

//     for (const lintMessage of messages) {
//       const { line, severity, ruleId, message } = lintMessage

//       if (severity !== 2) {
//         continue
//       }

//       annotations.push({
//         path: filePath.replace(`${GITHUB_WORKSPACE}/`, ''),
//         start_line: line,
//         end_line: line,
//         annotation_level: 'failure',
//         message: `[${ruleId}] ${message}`
//       })
//     }
//   }

//   return {
//     conclusion: errorCount > 0 ? 'failure' : 'success',
//     output: {
//       title: CHECK_NAME,
//       summary: `${errorCount} error(s) found`,
//       annotations
//     }
//   }
// }

async function run(): Promise<void> {
  const token = core.getInput('repo_token', { required: true })
  const prNumber = getPrNumber()

  try {
    const oktokit = new github.GitHub(token)
    core.debug('Creating check report')
    // core.debug('Fetching files to lint.')

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

    // const report = lint(files)
    const payload = await processReport()

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
