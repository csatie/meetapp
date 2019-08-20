import { Op } from 'sequelize';
import Meetup from '../models/Meetup';
import User from '../models/User';
import Subscription from '../models/Subscription';
import Mail from '../../lib/Mail';

class SubscriptionController {
  async store(req, res) {
    const user = await User.findByPk(req.userID);
    const meetup = await Meetup.findByPk(req.params.meetupID, {
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
          required: true,
        },
      ],
      order: [[Meetup, 'date']],
    });

    return res.json(subscriptions);
  }
}

export default new SubscriptionController();
