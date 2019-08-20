import Meetup from '../models/Meetup';

class MyMeetupsController {
  async index(req, res) {
    const meetups = await Meetup.findAll({ where: { user_id: req.userID } });

    return res.json(meetups);
  }
}

export default new MyMeetupsController();
