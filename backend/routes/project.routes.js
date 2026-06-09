import { Router } from 'express';
import { body } from 'express-validator';
import * as projectController from '../controllers/project.controller.js';
import * as authMiddleWare from '../middleware/auth.middleware.js';


const router = Router();


router.post('/create',
    authMiddleWare.authUser,
    body('name').isString().withMessage('Name is required'),
    projectController.createProject
)


router.get('/all',
    authMiddleWare.authUser, projectController.getAllProject
)

router.put('/add-user',
    authMiddleWare.authUser,
    body('projectId')
        .notEmpty().withMessage('Project ID is required')
        .isMongoId().withMessage('Project ID must be a valid MongoDB ObjectId'),
    body('users')
        .isArray({ min: 1 }).withMessage('Users must be an array of user IDs'),
    body('users.*')
        .notEmpty().withMessage('Each user ID is required')
        .isMongoId().withMessage('Each user must be a valid MongoDB ObjectId'),
    projectController.addUserToProject
)

router.get('/get-project/:projectId',
    authMiddleWare.authUser,
    projectController.getProjectById
)

router.put('/update-file-tree',
    authMiddleWare.authUser,
    body('projectId').isString().withMessage('Project ID is required'),
    body('fileTree').isObject().withMessage('File tree is required'),
    projectController.updateFileTree
)

router.delete('/:projectId',
    authMiddleWare.authUser,
    projectController.deleteProject)


export default router;