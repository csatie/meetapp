import { Op } from 'sequelize';
import Meetup from '../models/Meetup';
import User from '../models/User';
import Subscription from '../models/Subscription';
import File from '../models/File';
import Mail from '../../lib/Mail';

class SubscriptionController {
  async store(req, res) {
    const user = await User.findByPk(req.userID);
    const meetup = await Meetup.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
        },
      ],
    });

    if (meetup.user_id === req.userID) {
      return res
        .status(400)
        .json({ error: "You can't subscribe to this meetup" });
    }

    if (meetup.past) {
      return res.status(400).json({ error: 'This meetup is not available' });
    }

    // checando se existe outra inscrição do usuário no mesmo horário
    const checkDate = await Subscription.findOne({
      where: {
        user_id: user.id,
      },
      include: [
        {
          model: Meetup,
          required: true,
          where: {
            date: meetup.date,
          },
        },
      ],
    });

    if (checkDate) {
      return res
        .status(400)
        .json({ error: "Can't subscribe to two meetups at the same time" });
    }

    const subscription = await Subscription.create({
      user_id: user.id,
      meetup_id: meetup.id,
    });

    await Mail.sendMail({
      to: `${meetup.user.name} <${meetup.user.email}>`,
      subject: `Nova inscrição`,
      template: 'subscription',
      context: {
        owner: meetup.user.name,
        meetup: meetup.name,
        user: user.name,
        email: user.email,
      },
    });

    return res.json(subscription);
  }

  async delete(req, res) {
    const user_id = req.userID;

    const subscription = await Subscription.findByPk(req.params.id);

    // confere se usuário é dono do meetup
    if (subscription.user_id !== user_id) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    await subscription.destroy();

    return res.send();
  }

  async index(req, res) {
    const subscriptions = await Subscription.findAll({
      where: {
        user_id: req.userID,
      },
      include: [
        {
          model: Meetup,
          where: {
            date: {
              [Op.gt]: new Date(),
            },
          },
          include: [
            {
              model: User,
              as: 'user',
            },
            {
              model: File,
              as: 'file',
            },
          ],
        },
      ],
      order: [[Meetup, 'date']],
    });

    return res.json(subscriptions);
  }
}

export default new SubscriptionController();
