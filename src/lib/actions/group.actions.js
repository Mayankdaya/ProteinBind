import { connectToDatabase } from "../database/mongoose";
import Group from "../../app/model/group.model";
import Message from "../../app/model/message.model";

export async function createGroup(name, creatorId) {
  try {
    await connectToDatabase();
    const group = await Group.create({
      name,
      creator: creatorId,
      members: [creatorId],
    });
    return group;
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
}

export async function getAllGroups() {
  try {
    await connectToDatabase();
    const groups = await Group.find().populate('creator members').exec();
    return groups;
  } catch (error) {
    console.error('Error getting groups:', error);
    throw error;
  }
}

export async function addMessageToGroup(groupId, senderId, text) {
  try {
    await connectToDatabase();
    const message = await Message.create({
      group: groupId,
      sender: senderId,
      text,
      timestamp: new Date(),
    });
    return message;
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

export async function getGroupMessages(groupId) {
  try {
    await connectToDatabase();
    const messages = await Message.find({ group: groupId })
      .populate('sender')
      .sort({ timestamp: 1 })
      .exec();
    return messages;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
}

export async function addMemberToGroup(groupId, memberId) {
  try {
    await connectToDatabase();
    const group = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: memberId } },
      { new: true }
    ).populate('members');
    return group;
  } catch (error) {
    console.error('Error adding member:', error);
    throw error;
  }
}

export async function removeMemberFromGroup(groupId, memberId) {
  try {
    await connectToDatabase();
    const group = await Group.findByIdAndUpdate(
      groupId,
      { $pull: { members: memberId } },
      { new: true }
    ).populate('members');
    return group;
  } catch (error) {
    console.error('Error removing member:', error);
    throw error;
  }
}