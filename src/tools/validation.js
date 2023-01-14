import Joi from 'joi';

export const userSchema = Joi.object({
    name: Joi.string().required()
});

export const messagesSchema = Joi.object({
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.string().valid('message', 'private_message').required()
  });