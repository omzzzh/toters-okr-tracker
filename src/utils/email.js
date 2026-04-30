import { TEAM } from '../data/constants';
import { ownerList } from './helpers';

let emailjsReady = false;

export const initEmailJS = (publicKey) => {
  if (!publicKey) return;
  try {
    if (window.emailjs) { window.emailjs.init({ publicKey }); emailjsReady = true; }
  } catch (e) { console.warn('EmailJS init failed', e); }
};

export const sendEmail = async (settings, toEmail, toName, subject, message, fromName) => {
  const { ejsPK, ejsSID, ejsTID } = settings;
  if (!ejsPK || !ejsSID || !ejsTID) { console.log('Email (not configured):', toEmail, subject); return; }
  try {
    await window.emailjs.send(ejsSID, ejsTID, { to_email: toEmail, to_name: toName, subject, message, from_name: fromName || 'Toters OKR Tracker', reply_to: '' });
  } catch (e) { console.warn('Email send failed:', e); }
};

export const emailMentioned = (settings, email, name, commenterName, projectName, commentText) => {
  const subject = `${commenterName} mentioned you in a comment on "${projectName}"`;
  const message = `Hi ${name},\n\n${commenterName} mentioned you in a comment on "${projectName}":\n\n"${commentText}"\n\nOpen Toters OKR Tracker to view and respond.\n\n— Toters Product Team`;
  sendEmail(settings, email, name, subject, message, commenterName);
};

export const emailProjectOwners = (settings, project, commenterName, commentText, weekLabel) => {
  ownerList(project.owner).forEach(ownerName => {
    const member = TEAM.find(t => t.name.toLowerCase().includes(ownerName.split(' ')[0].toLowerCase()));
    if (!member || member.name === commenterName) return;
    const subject = `New comment on "${project.name}" — ${weekLabel}`;
    const message = `Hi ${member.name},\n\n${commenterName} left a comment on "${project.name}":\n\n"${commentText}"\n\nOpen Toters OKR Tracker to view and respond.\n\n— Toters Product Team`;
    sendEmail(settings, member.email, member.name, subject, message, commenterName);
  });
};

export const getMentionedEmails = (text) =>
  [...text.matchAll(/@([\w.]+@[\w.]+)/g)].map(m => m[1]);
