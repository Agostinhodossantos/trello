import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/util/mongodb';
import checkEnvironment from '@/util/check-environment';
import sgMail from '@sendgrid/mail';
import shortId from 'shortid';
import uniqid from 'uniqid';
import nodemailer from 'nodemailer';
import buildInviteEmail from '@/util/templent';

const sendNodeMail = async (email, res, emailData, user) => {
  const url = checkEnvironment();
  const page = 'signup';
  const host = process.env.MAIL_HOST;
  const from = process.env.EMAIL;
  const pass = process.env.MAIL_PASSWORD;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: from,
      pass: pass
    }
  });

  const link = `${url}/${page}?token=${emailData.token}&email=${email}&boardId=${emailData.boardId}`;
  const mailOptions = {
    from: from,
    to: email,
    subject: 'Você está convidado a participar de um quadro de INE PM',
    html: buildInviteEmail(link)
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};

const sendMail = (email, res, emailData, user) => {
  sendNodeMail(email, res, emailData, user);
  const url = checkEnvironment();
  const page = 'signup';
  const link = `${url}/${page}?token=${emailData.token}&email=${email}&boardId=${emailData.boardId}`;
  console.log(link);

  const msg = {
    to: email,
    from: 'agostinho.machava@infopel.co.mz',
    subject: 'You are invited to join to a trello clone board',
    html: `<div>
      <div style="height:100px; background-color:#26292c; color: white">
        <p>Trello Clone</p>
      <div>
      <div style="height:200px; background-color:#0079bf;">
        <a href='${url}/${page}?token=${emailData.token}&email=${email}&boardId=${emailData.boardId}'>Join</a>
      </div>
      <div style="height:100px; background-color:#26292c;">

      </div>
    </div>`
  };

  sgMail
    .send(msg)
    .then(() => {
      res.send({ message: 'Email sent sucessfully', status: 200 });
    })
    .catch((error) => {
      console.log('Failed');
      console.error(error);
      res.send({ message: 'Failed to send' });
    });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const { db, client } = await connectToDatabase();

  if (client.isConnected()) {
    const requestType = req.method;

    switch (requestType) {
      case 'POST': {
        const { email, boardId } = req.body;

        const token = uniqid();
        const id = shortId.generate();

        const emailData = {
          id,
          token,
          boardId
        };

        await db
          .collection('token')
          .insertOne({ token, userId: id, status: 'valid', email, boardId });
        const user = await db.collection('users').findOne({ email });

        await sendMail(email, res, emailData, user);

        res.status(200);

        return;
      }

      default:
        res.send({ message: 'DB error' });
        break;
    }
  } else {
    res.send({ msg: 'DB connection error', status: 400 });
  }
}
