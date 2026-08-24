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
    const survey = surveyService.getSurvey(req.params.id);
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

    const responseId = surveyService.saveResponse(survey.id, validated);
    answerData.responseId = responseId;

    if (typeof config.hooks.afterSubmit === 'function') {
      try {
        await config.hooks.afterSubmit(answerData);
      } catch (error) {
        // 数据已经提交成功，扩展系统故障不应诱导用户重复提交。
        console.error(`[afterSubmit] ${error.stack || error.message}`);
      }
    }

    res.status(201).json({ id: responseId, message: '感谢参与' });
  }));

  return router;
}

module.exports = { createPublicRoutes };
