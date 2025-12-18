# Build Stage
FROM node:22-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# ... (Top of your Dockerfile)

# 1. Accept the argument with the NEW name
ARG VITE_GEMINI_API_KEY

# 2. Set the environment variable so Vite can see it
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# ... (Rest of your Dockerfile, e.g., RUN npm run build)

RUN npm run build

# Serve Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]