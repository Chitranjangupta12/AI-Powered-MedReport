/**
 * Evaluation and Research Benchmark Controller
 * Endpoint:
 * - GET /api/evaluations
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const BENCHMARK_FILE = path.join(__dirname, '../../../evaluation/benchmark_results.json');
const DATASET_FILE = path.join(__dirname, '../../../evaluation/datasets/synthetic_reports.json');

class EvalController {
  getEvaluationBenchmark(req, res, next) {
    try {
      let benchmarks = null;
      let dataset = [];

      if (fs.existsSync(BENCHMARK_FILE)) {
        benchmarks = JSON.parse(fs.readFileSync(BENCHMARK_FILE, 'utf8'));
      }
      if (fs.existsSync(DATASET_FILE)) {
        dataset = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf8'));
      }

      res.json({
        success: true,
        benchmarks,
        total_samples: dataset.length,
        dataset: dataset.map(d => ({
          id: d.id,
          report_name: d.report_name,
          report_type: d.report_type,
          urgency_category: d.ground_truth.urgency_category,
          abnormal_count: d.ground_truth.abnormal_count,
          normal_count: d.ground_truth.normal_count,
          watermark: d.synthetic_watermark
        }))
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EvalController();
