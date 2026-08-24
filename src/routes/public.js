'use strict';

const express = require('express');
const { asyncRoute } = require('../lib/http');

function createPublicRoutes({ db, config, surveyService }) {
  const router = express.Router();

  router.get('/s/:id', (req, res) => {
    const survey = surveyService.getSurvey(req.params.id);
    surveyService.ensureSurveyOpen(survey);
    res.render('survey', { survey, siteName: config.siteName });
  });

  router.get('/api/surveys/:id', (req, res) => {
    const survey = surveyService.getSurvey(req.params.id);
    surveyService.ensureSurveyOpen(survey);
    res.json(survey);
  });

  router.post('/api/surveys/:id/responses', asyncRoute(async (req, res) => {
    // 判分需要内部标准答案，但这些字段从不通过公开 GET API 或 EJS 页面下发。
    const survey = surveyService.getSurvey(req.params.id, true, true);
    surveyService.ensureSurveyOpen(survey);
    const validated = surveyService.validateAnswers(survey, req.body.answers);
    const answerData = {
      survey: { id: survey.id, title: survey.title },
      answers: validated.map(({ question, value }) => ({
        questionId: question.id,
        title: question.title,
        type: question.type,
        value
      })),
      submittedAt: new Date().toISOString()
    };

    if (typeof config.hooks.beforeSubmit === 'function') {
      await config.hooks.beforeSubmit(answerData);
    }

    const result = surveyService.saveResponse(survey, validated);
    const { responseId } = result;
    answerData.responseId = responseId;
    answerData.score = result.score;
    answerData.maxScore = result.maxScore;

    if (typeof config.hooks.afterSubmit === 'function') {
      try {
        await config.hooks.afterSubmit(answerData);
      } catch (error) {
        // 数据已经提交成功，扩展系统故障不应诱导用户重复提交。
        console.error(`[afterSubmit] ${error.stack || error.message}`);
      }
    }

    res.status(201).json({
      id: responseId,
      message: survey.kind === 'exam' ? '答题完成' : '感谢参与',
      kind: survey.kind,
      score: result.score,
      maxScore: result.maxScore
    });
  }));

  return router;
}

module.exports = { createPublicRoutes };
