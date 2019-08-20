import * as Yup from 'yup';
import { Op } from 'sequelize';
import { isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';
import Meetup from '../models/Meetup';
import User from '../models/User';

class MeetupController {
  async store(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string().required(),
      file_id: Yup.number().required(),
      description: Yup.string().required(),
      location: Yup.string().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    // data passada
    if (isBefore(parseISO(req.body.date), new Date())) {
      return res.status(400).json({ error: 'Invalid date' });
    }

    const user_id = req.userID;

    const meetup = await Meetup.create({
      ...req.body,
      user_id,
    });

    return res.json(meetup);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string(),
      file_id: Yup.number(),
      description: Yup.string(),
      location: Yup.string(),
      date: Yup.date(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const user_id = req.userID;

    const meetup = await Meetup.findByPk(req.params.id);

    // confere se usuário é dono do meetup
    if (meetup.user_id !== user_id) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    // evento já aconteceu
    if (meetup.past) {
      return res.status(400).json({ error: 'Meetup not available' });
    }

    // data passada
    if (isBefore(parseISO(req.body.date), new Date())) {
      return res.status(400).json({ error: 'Invalid date' });
    }

    await meetup.update(req.body);

    return res.json(meetup);
  }

  async delete(req, res) {
    const user_id = req.userID;

    const meetup = await Meetup.findByPk(req.params.id);

    // confere se usuário é dono do meetup
    if (meetup.user_id !== user_id) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    // evento já aconteceu
    if (meetup.past) {
      return res.status(400).json({ error: 'Meetup not available' });
    }

    await meetup.destroy();

    return res.send();
  }

  async index(req, res) {
    const where = {};
    const page = req.query.page || 1;

    // filtro por data
    if (req.query.date) {
      const searchDate = parseISO(req.query.date);

      where.date = {
        [Op.between]: [startOfDay(searchDate), endOfDay(searchDate)],
      };
    }

    const meetups = await Meetup.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
        },
      ],
      limit: 10,
      offset: 10 * page - 10,
    });

    return res.json(meetups);
  }
}

export default new MeetupController();
