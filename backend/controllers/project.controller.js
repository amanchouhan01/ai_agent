import projectModel from '../models/project.model.js';
import * as projectService from '../services/project.service.js';
import userModel from '../models/user.model.js';
import { validationResult } from 'express-validator';
import Project from '../models/project.model.js';


export const createProject = async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }


    try {

        const { name } = req.body;
        const userId = req.user._id;

        const newProject = await projectService.createProject({ name, userId });

        res.status(201).json(newProject);
    } catch (err) {
        console.log(err);
        res.status(400).send(err.message);
    }

}

export const getAllProject = async (req, res) => {
    try {
        const loggedInUser = await userModel.findOne({
            email: req.user.email
        })

        const allUserProjects = await projectService.getAllProjectByUserId({
            userId: loggedInUser._id
        })

        return res.status(200).json({
            projects: allUserProjects
        })
    } catch (err) {
        console.log(err)
        res.status(400).json({ error: err.message })
    }
}

export const addUserToProject = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { projectId, users } = req.body;
        const loggedInUser = await userModel.findOne({
            email: req.user.email
        })
        const updatedProject = await projectService.addUsersToProject({
            projectId,
            users,
            userId: loggedInUser._id
        });

        return res.status(200).json(updatedProject);
    } catch (err) {
        console.log(err);
        res.status(400).json({ error: err.message });
    }
}

export const getProjectById = async(req, res) => {
    const {projectId} = req.params;
    try {
        const project = await projectService.getProjectById({
            projectId
        });

        return res.status(200).json({
            project
        })


    } catch (err) {
        console.log(err)
        res.status(400).json({error: err.message})
    }
}

export const updateFileTree = async (req, res) => {
    const errors = validationResult(req);
    
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }

    try{
        const{projectId, fileTree} = req.body;

        const project = await projectService.updateFileTree({
            projectId,
            fileTree
        })

        return res.status(200).json({
            project
        })
    }
    catch(err){
        console.log(err)
        res.status(400).json({error: err.message})
    }
}

export const deleteProject = async (req, res) => {
    try{
        const{projectId} = req.params;
        const project = await Project.findByIdAndDelete(projectId);

        if(!project){
            return res.status(404).json({
                success: false,
                messages: "Project Not Found",
            });
        }

        res.status(200).json({
            success:true,
            message: "Project deleted successfully",
        });

    }
    catch(error){
        res.status(500).json({
            success:false,
            message: error.message,
        });
    }
};