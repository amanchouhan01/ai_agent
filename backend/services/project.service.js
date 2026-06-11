import mongoose from 'mongoose';
import projectModel from "../models/project.model.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const createProject = async ({ name, userId }) => {
    if (!name) {
        throw new Error('Name is required')
    }
    if (!userId) {
        throw new Error('User is required')
    }
    if (!isValidObjectId(userId)) {
        throw new Error('User ID must be a valid MongoDB ObjectId')
    }

    try {
        const project = await projectModel.create({
            name,
            users: [userId]
        })

        return project;
    } catch (err) {
        // Handle Mongo duplicate key error (E11000)
        if (err && err.code === 11000) {
            throw new Error('Project name already exists');
        }
        throw err;
    }
}

export const getAllProjectByUserId = async ({ userId }) => {
    if (!userId) {
        throw new Error('UserId is required')
    }
    if (!isValidObjectId(userId)) {
        throw new Error('User ID must be a valid MongoDB ObjectId')
    }

    const allUserProjects = await projectModel.find({
        users: userId
    }).select('-messages')

    return allUserProjects;
}

export const addUsersToProject = async ({ projectId, users, userId }) => {
    if (!projectId) {
        throw new Error("projectId is required")
    }
    if (!isValidObjectId(projectId)) {
        throw new Error('projectId must be a valid MongoDB ObjectId')
    }

    if (!users) {
        throw new Error("users are required")
    }
    if (!Array.isArray(users) || users.length === 0) {
        throw new Error('Users must be a non-empty array')
    }

    if (!userId) {
        throw new Error("userId is required")
    }

    const invalidUsers = users.filter((user) => !isValidObjectId(user));
    if (invalidUsers.length > 0) {
        throw new Error(`Invalid user ID(s): ${invalidUsers.join(', ')}`)
    }

    const project = await projectModel.findOne({
        _id: projectId,
        users: userId
    })

    if (!project) {
        throw new Error("User not belong to this project")
    }

    const updatedProject = await projectModel.findByIdAndUpdate(
        projectId,
        { $addToSet: { users: { $each: users } } },
        { new: true }
    );

    if (!updatedProject) {
        throw new Error('Project not found')
    }

    return updatedProject;
}

export const getProjectById = async ({ projectId }) => {
    if (!projectId) {
        throw new Error("projectId is require")
    }

    if (!isValidObjectId(projectId)) {
        throw new Error("Invalid projectId")
    }

    const project = await projectModel.findOne({
        _id: projectId
    }).populate('users')

    return project;
}

export const updateFileTree = async ({ projectId, fileTree }) => {
    if (!projectId) {
        throw new Error("projectId is required")
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId")
    }

    if (!fileTree) {
        throw new Error("fileTree is required")
    }

    const project = await projectModel.findOneAndUpdate({
        _id: projectId
    }, {
        fileTree
    }, {
        new: true
    })

    return project;
}