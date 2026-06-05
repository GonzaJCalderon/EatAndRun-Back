--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8 (Debian 16.8-1.pgdg120+1)
-- Dumped by pg_dump version 17.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: item_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.item_type_enum AS ENUM (
    'daily',
    'extra',
    'tarta'
);


ALTER TYPE public.item_type_enum OWNER TO postgres;

--
-- Name: order_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_status AS ENUM (
    'pendiente',
    'preparando',
    'en camino',
    'entregado'
);


ALTER TYPE public.order_status OWNER TO postgres;

--
-- Name: order_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_status_enum AS ENUM (
    'pendiente',
    'preparando',
    'en camino',
    'entregado',
    'cancelado',
    'no_entregado'
);


ALTER TYPE public.order_status_enum OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: configuraciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.configuraciones (
    clave text NOT NULL,
    valor jsonb NOT NULL
);


ALTER TABLE public.configuraciones OWNER TO postgres;

--
-- Name: daily_menu; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_menu (
    id integer NOT NULL,
    date date NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    price numeric(6,2),
    for_role character varying(20) NOT NULL,
    image_url text,
    CONSTRAINT daily_menu_for_role_check CHECK (((for_role)::text = ANY (ARRAY[('usuario'::character varying)::text, ('empresa'::character varying)::text])))
);


ALTER TABLE public.daily_menu OWNER TO postgres;

--
-- Name: daily_menu_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_menu_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_menu_id_seq OWNER TO postgres;

--
-- Name: daily_menu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_menu_id_seq OWNED BY public.daily_menu.id;


--
-- Name: empresa_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empresa_users (
    id integer NOT NULL,
    empresa_id integer,
    user_id integer,
    rol character varying(20) DEFAULT 'empleado'::character varying
);


ALTER TABLE public.empresa_users OWNER TO postgres;

--
-- Name: empresa_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.empresa_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.empresa_users_id_seq OWNER TO postgres;

--
-- Name: empresa_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.empresa_users_id_seq OWNED BY public.empresa_users.id;


--
-- Name: empresas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empresas (
    id integer NOT NULL,
    user_id integer,
    razon_social text NOT NULL,
    cuit text NOT NULL,
    codigo_invitacion text,
    codigo_expira timestamp without time zone
);


ALTER TABLE public.empresas OWNER TO postgres;

--
-- Name: empresas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.empresas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.empresas_id_seq OWNER TO postgres;

--
-- Name: empresas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.empresas_id_seq OWNED BY public.empresas.id;


--
-- Name: fixed_menu; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fixed_menu (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    price numeric(6,2) NOT NULL,
    image_url text,
    for_role character varying(20) DEFAULT 'usuario'::character varying NOT NULL
);


ALTER TABLE public.fixed_menu OWNER TO postgres;

--
-- Name: fixed_menu_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fixed_menu_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fixed_menu_id_seq OWNER TO postgres;

--
-- Name: fixed_menu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fixed_menu_id_seq OWNED BY public.fixed_menu.id;


--
-- Name: kitchen_order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kitchen_order_items (
    id integer NOT NULL,
    kitchen_order_id integer,
    categoria text NOT NULL,
    nombre_item text NOT NULL,
    cantidad integer NOT NULL
);


ALTER TABLE public.kitchen_order_items OWNER TO postgres;

--
-- Name: kitchen_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.kitchen_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.kitchen_order_items_id_seq OWNER TO postgres;

--
-- Name: kitchen_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.kitchen_order_items_id_seq OWNED BY public.kitchen_order_items.id;


--
-- Name: kitchen_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kitchen_orders (
    id integer NOT NULL,
    fecha_entrega date NOT NULL,
    nombre_cliente text,
    observaciones text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.kitchen_orders OWNER TO postgres;

--
-- Name: kitchen_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.kitchen_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.kitchen_orders_id_seq OWNER TO postgres;

--
-- Name: kitchen_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.kitchen_orders_id_seq OWNED BY public.kitchen_orders.id;


--
-- Name: menu_daily; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_daily (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    price numeric,
    date date,
    for_role text,
    image_url text
);


ALTER TABLE public.menu_daily OWNER TO postgres;

--
-- Name: menu_daily_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.menu_daily_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menu_daily_id_seq OWNER TO postgres;

--
-- Name: menu_daily_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.menu_daily_id_seq OWNED BY public.menu_daily.id;


--
-- Name: menu_extras; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_extras (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    available boolean DEFAULT true
);


ALTER TABLE public.menu_extras OWNER TO postgres;

--
-- Name: menu_extras_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.menu_extras_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menu_extras_id_seq OWNER TO postgres;

--
-- Name: menu_extras_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.menu_extras_id_seq OWNED BY public.menu_extras.id;


--
-- Name: menu_fixed; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_fixed (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    price numeric,
    image_url text,
    for_role text
);


ALTER TABLE public.menu_fixed OWNER TO postgres;

--
-- Name: menu_fixed_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.menu_fixed_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menu_fixed_id_seq OWNER TO postgres;

--
-- Name: menu_fixed_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.menu_fixed_id_seq OWNED BY public.menu_fixed.id;


--
-- Name: menu_semana; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_semana (
    semana_inicio date NOT NULL,
    habilitado boolean DEFAULT false,
    cierre timestamp without time zone,
    id integer NOT NULL,
    semana_fin date,
    dias_habilitados jsonb DEFAULT '{"lunes": true, "jueves": true, "martes": true, "viernes": true, "miercoles": true}'::jsonb
);


ALTER TABLE public.menu_semana OWNER TO postgres;

--
-- Name: menu_semana_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.menu_semana_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menu_semana_id_seq OWNER TO postgres;

--
-- Name: menu_semana_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.menu_semana_id_seq OWNED BY public.menu_semana.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer,
    item_type character varying(10),
    item_id text,
    quantity integer NOT NULL,
    dia text,
    item_name text,
    precio_unitario integer,
    CONSTRAINT order_items_item_type_check CHECK (((item_type)::text = ANY (ARRAY[('daily'::character varying)::text, ('extra'::character varying)::text, ('tarta'::character varying)::text, ('fijo'::character varying)::text, ('skip'::character varying)::text]))),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_status_history (
    id integer NOT NULL,
    order_id integer,
    status character varying(20) NOT NULL,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    motivo text
);


ALTER TABLE public.order_status_history OWNER TO postgres;

--
-- Name: order_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_status_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_status_history_id_seq OWNER TO postgres;

--
-- Name: order_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_status_history_id_seq OWNED BY public.order_status_history.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    user_id integer,
    status public.order_status_enum DEFAULT 'pendiente'::public.order_status_enum,
    total numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    delivery_id integer,
    fecha_entrega date,
    observaciones text,
    comprobante_base64 text,
    comprobante_url text,
    metodo_pago text,
    comprobante_nombre text,
    assigned_to integer,
    motivo_no_entregado text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tipo_menu text,
    delivery_name text,
    delivery_phone text,
    nota_admin text
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(20) NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: special_company_menu; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.special_company_menu (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    date date NOT NULL,
    image_url text,
    for_role text
);


ALTER TABLE public.special_company_menu OWNER TO postgres;

--
-- Name: special_company_menu_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.special_company_menu_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.special_company_menu_id_seq OWNER TO postgres;

--
-- Name: special_company_menu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.special_company_menu_id_seq OWNED BY public.special_company_menu.id;


--
-- Name: tartas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tartas (
    id integer NOT NULL,
    key text NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    img text,
    precio integer DEFAULT 13500
);


ALTER TABLE public.tartas OWNER TO postgres;

--
-- Name: tartas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tartas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tartas_id_seq OWNER TO postgres;

--
-- Name: tartas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tartas_id_seq OWNED BY public.tartas.id;


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_profiles (
    id integer NOT NULL,
    user_id integer,
    telefono text,
    direccion_principal text,
    direccion_alternativa text,
    direccion_secundaria text,
    apellido text
);


ALTER TABLE public.user_profiles OWNER TO postgres;

--
-- Name: user_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_profiles_id_seq OWNER TO postgres;

--
-- Name: user_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_profiles_id_seq OWNED BY public.user_profiles.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password text NOT NULL,
    role_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    role integer DEFAULT 1,
    last_name text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: daily_menu id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_menu ALTER COLUMN id SET DEFAULT nextval('public.daily_menu_id_seq'::regclass);


--
-- Name: empresa_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa_users ALTER COLUMN id SET DEFAULT nextval('public.empresa_users_id_seq'::regclass);


--
-- Name: empresas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresas ALTER COLUMN id SET DEFAULT nextval('public.empresas_id_seq'::regclass);


--
-- Name: fixed_menu id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_menu ALTER COLUMN id SET DEFAULT nextval('public.fixed_menu_id_seq'::regclass);


--
-- Name: kitchen_order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kitchen_order_items ALTER COLUMN id SET DEFAULT nextval('public.kitchen_order_items_id_seq'::regclass);


--
-- Name: kitchen_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kitchen_orders ALTER COLUMN id SET DEFAULT nextval('public.kitchen_orders_id_seq'::regclass);


--
-- Name: menu_daily id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_daily ALTER COLUMN id SET DEFAULT nextval('public.menu_daily_id_seq'::regclass);


--
-- Name: menu_extras id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_extras ALTER COLUMN id SET DEFAULT nextval('public.menu_extras_id_seq'::regclass);


--
-- Name: menu_fixed id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_fixed ALTER COLUMN id SET DEFAULT nextval('public.menu_fixed_id_seq'::regclass);


--
-- Name: menu_semana id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_semana ALTER COLUMN id SET DEFAULT nextval('public.menu_semana_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: order_status_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history ALTER COLUMN id SET DEFAULT nextval('public.order_status_history_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: special_company_menu id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.special_company_menu ALTER COLUMN id SET DEFAULT nextval('public.special_company_menu_id_seq'::regclass);


--
-- Name: tartas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tartas ALTER COLUMN id SET DEFAULT nextval('public.tartas_id_seq'::regclass);


--
-- Name: user_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles ALTER COLUMN id SET DEFAULT nextval('public.user_profiles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: configuraciones configuraciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuraciones
    ADD CONSTRAINT configuraciones_pkey PRIMARY KEY (clave);


--
-- Name: daily_menu daily_menu_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_menu
    ADD CONSTRAINT daily_menu_pkey PRIMARY KEY (id);


--
-- Name: empresa_users empresa_users_empresa_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa_users
    ADD CONSTRAINT empresa_users_empresa_id_user_id_key UNIQUE (empresa_id, user_id);


--
-- Name: empresa_users empresa_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa_users
    ADD CONSTRAINT empresa_users_pkey PRIMARY KEY (id);


--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- Name: fixed_menu fixed_menu_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_menu
    ADD CONSTRAINT fixed_menu_pkey PRIMARY KEY (id);


--
-- Name: kitchen_order_items kitchen_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kitchen_order_items
    ADD CONSTRAINT kitchen_order_items_pkey PRIMARY KEY (id);


--
-- Name: kitchen_orders kitchen_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kitchen_orders
    ADD CONSTRAINT kitchen_orders_pkey PRIMARY KEY (id);


--
-- Name: menu_daily menu_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_daily
    ADD CONSTRAINT menu_daily_pkey PRIMARY KEY (id);


--
-- Name: menu_extras menu_extras_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_extras
    ADD CONSTRAINT menu_extras_pkey PRIMARY KEY (id);


--
-- Name: menu_fixed menu_fixed_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_fixed
    ADD CONSTRAINT menu_fixed_pkey PRIMARY KEY (id);


--
-- Name: menu_semana menu_semana_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_semana
    ADD CONSTRAINT menu_semana_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: menu_semana semana_unica; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_semana
    ADD CONSTRAINT semana_unica UNIQUE (semana_inicio);


--
-- Name: special_company_menu special_company_menu_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.special_company_menu
    ADD CONSTRAINT special_company_menu_pkey PRIMARY KEY (id);


--
-- Name: tartas tartas_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tartas
    ADD CONSTRAINT tartas_key_key UNIQUE (key);


--
-- Name: tartas tartas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tartas
    ADD CONSTRAINT tartas_pkey PRIMARY KEY (id);


--
-- Name: users unique_email; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_email UNIQUE (email);


--
-- Name: empresa_users unique_empresa_user; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa_users
    ADD CONSTRAINT unique_empresa_user UNIQUE (empresa_id, user_id);


--
-- Name: special_company_menu unique_name_date; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.special_company_menu
    ADD CONSTRAINT unique_name_date UNIQUE (name, date);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: empresa_users empresa_users_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa_users
    ADD CONSTRAINT empresa_users_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;


--
-- Name: empresa_users empresa_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa_users
    ADD CONSTRAINT empresa_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: empresas empresas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: kitchen_order_items kitchen_order_items_kitchen_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kitchen_order_items
    ADD CONSTRAINT kitchen_order_items_kitchen_order_id_fkey FOREIGN KEY (kitchen_order_id) REFERENCES public.kitchen_orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: orders orders_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: orders orders_delivery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--

