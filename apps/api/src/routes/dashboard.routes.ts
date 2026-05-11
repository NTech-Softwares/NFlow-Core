import { Router } from 'express'
import { DashboardController } from '../controllers/dashboard.controller'

const dashboardRoutes = Router()

dashboardRoutes.get('/', DashboardController.index)

export default dashboardRoutes