import React from "react";
import Home from "../components/Home";
import NewPost from "../components/NewPost";
import PostPage from "../components/PostPage";
import EditPost from "../components/EditPost";
import DeletePost from "../components/DeletePost";
import Login from "../components/Login";
import Register from "../components/Register";
import CityFeed from "../components/CityFeed";
import About from "../components/About";
import News from "../pages/News";
import Support from "../pages/Support";
import Evaluate from "../pages/Evaluate";
import MapPage from "../pages/Map";
import History from "../pages/History";
import Profile from "../pages/Profile";
import Plans from "../pages/Plans";
import EvaluationDetail from "../pages/EvaluationDetail";
import ProtectedRoute from "../components/ProtectedRoute";
import NotFound from "../components/NotFound";
import {
  HOME_ROUTE,
  NEW_POST_ROUTE,
  POST_ROUTE,
  EDIT_POST_ROUTE,
  DELETE_POST_ROUTE,
  CITY_ROUTE,
  LOGIN_ROUTE,
  REGISTER_ROUTE,
  ABOUT_ROUTE,
  NEWS_ROUTE,
  SUPPORT_ROUTE,
  EVALUATE_ROUTE,
  MAP_ROUTE,
  HISTORY_ROUTE,
  PROFILE_ROUTE,
  EVALUATION_DETAIL_ROUTE,
  PLANS_ROUTE,
} from "./consts";

export const routes = [
  { path: HOME_ROUTE, element: <Home /> },
  { path: NEWS_ROUTE, element: <News /> },
  { path: SUPPORT_ROUTE, element: <ProtectedRoute><Support /></ProtectedRoute> },
  {
    path: NEW_POST_ROUTE,
    element: (
      <ProtectedRoute requireAdmin>
        <NewPost />
      </ProtectedRoute>
    ),
  },
  { path: POST_ROUTE, element: <PostPage /> },
  {
    path: EDIT_POST_ROUTE,
    element: (
      <ProtectedRoute requireAdmin>
        <EditPost />
      </ProtectedRoute>
    ),
  },
  {
    path: DELETE_POST_ROUTE,
    element: (
      <ProtectedRoute requireAdmin>
        <DeletePost />
      </ProtectedRoute>
    ),
  },
  { path: CITY_ROUTE, element: <CityFeed /> },
  { path: LOGIN_ROUTE, element: <Login /> },
  { path: REGISTER_ROUTE, element: <Register /> },
  { path: ABOUT_ROUTE, element: <About /> },
  { path: EVALUATE_ROUTE, element: <Evaluate /> },
  { path: MAP_ROUTE, element: <MapPage /> },
  { path: HISTORY_ROUTE, element: <History /> },
  { path: PROFILE_ROUTE, element: <Profile /> },
  { path: PLANS_ROUTE, element: <Plans /> },
  { path: EVALUATION_DETAIL_ROUTE, element: <EvaluationDetail /> },
  { path: "*", element: <NotFound /> },
];

export default routes;
