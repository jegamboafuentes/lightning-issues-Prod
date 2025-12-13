# Build Stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# --- START OF NEW LINES ---
# 1. Accept the arguments from cloudbuild.yaml
ARG VITE_EMAILJS_SERVICE_ID
ARG VITE_EMAILJS_PUBLIC_KEY
ARG VITE_EMAILJS_TEMPLATE_ADMIN
ARG VITE_EMAILJS_TEMPLATE_CUSTOMER

# 2. Set them as environment variables so Vite can read them during build
ENV VITE_EMAILJS_SERVICE_ID=$VITE_EMAILJS_SERVICE_ID
ENV VITE_EMAILJS_PUBLIC_KEY=$VITE_EMAILJS_PUBLIC_KEY
ENV VITE_EMAILJS_TEMPLATE_ADMIN=$VITE_EMAILJS_TEMPLATE_ADMIN
ENV VITE_EMAILJS_TEMPLATE_CUSTOMER=$VITE_EMAILJS_TEMPLATE_CUSTOMER
# --- END OF NEW LINES ---

RUN npm run build

# Serve Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]