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
} from "./consts";

export const routes = [
  { path: HOME_ROUTE, element: <Home /> },
  { path: NEW_POST_ROUTE, element: <NewPost /> },
  { path: POST_ROUTE, element: <PostPage /> },
  { path: EDIT_POST_ROUTE, element: <EditPost /> },
  { path: DELETE_POST_ROUTE, element: <DeletePost /> },
  { path: CITY_ROUTE, element: <CityFeed /> },
  { path: LOGIN_ROUTE, element: <Login /> },
  { path: REGISTER_ROUTE, element: <Register /> },
  { path: ABOUT_ROUTE, element: <About /> },
];

export default routes;
