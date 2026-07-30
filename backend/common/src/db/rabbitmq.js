const amqp = require('amqplib');
const { randomUUID } = require('crypto');
const env = require('../config/env');
const logger = require('../utils/logger');

let connection;
let channel;

async function connectRabbitMQ() {
  if (!connection) {
    const encodedVhost = encodeURIComponent(env.rabbitmq.vhost);
    const amqpUrl = `amqp://${env.rabbitmq.user}:${env.rabbitmq.password}@${env.rabbitmq.host}:${env.rabbitmq.port}/${encodedVhost}`;
    connection = await amqp.connect(amqpUrl);
    connection.on('error', (error) => logger.error('RabbitMQ connection error', error));
    connection.on('close', () => {
      channel = null;
      connection = null;
      logger.warn('RabbitMQ connection closed');
    });
  }

  return connection;
}

async function getRabbitChannel() {
  if (!channel) {
    const conn = await connectRabbitMQ();
    channel = await conn.createChannel();
    await channel.assertExchange(env.rabbitmq.exchange, 'topic', { durable: true });
    await channel.prefetch(10);

    const bindings = [
      [env.rabbitmq.queues.orderCreated, env.rabbitmq.routingKeys.orderCreated],
      [env.rabbitmq.queues.orderPaid, env.rabbitmq.routingKeys.orderPaid],
      [env.rabbitmq.queues.stockDeduct, env.rabbitmq.routingKeys.stockDeduct],
      [env.rabbitmq.queues.stockRollback, env.rabbitmq.routingKeys.stockRollback]
    ];

    for (const [queueName, routingKey] of bindings) {
      await channel.assertQueue(queueName, { durable: true });
      await channel.bindQueue(queueName, env.rabbitmq.exchange, routingKey);
    }
  }

  return channel;
}

async function publishMessage(routingKey, payload, options = {}) {
  const currentChannel = await getRabbitChannel();
  const messageId = options.messageId || randomUUID();
  currentChannel.publish(
    env.rabbitmq.exchange,
    routingKey,
    Buffer.from(JSON.stringify(payload)),
    {
      persistent: true,
      contentType: 'application/json',
      messageId,
      timestamp: Date.now(),
      headers: options.headers || {}
    }
  );
  return messageId;
}

async function consumeMessage(queueName, handler) {
  const currentChannel = await getRabbitChannel();
  await currentChannel.consume(queueName, async (message) => {
    if (!message) {
      return;
    }

    try {
      const payload = JSON.parse(message.content.toString());
      await handler(payload, {
        queueName,
        messageId: message.properties.messageId || '',
        routingKey: message.fields.routingKey,
        raw: message
      });
      currentChannel.ack(message);
    } catch (error) {
      logger.error(`RabbitMQ consumer failed for ${queueName}`, error);
      currentChannel.nack(message, false, false);
    }
  });
}

module.exports = {
  getRabbitChannel,
  publishMessage,
  consumeMessage
};
