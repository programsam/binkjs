# Example Below

# Install Terraform? Push tf file to allow exact deployment of the test s3 bucket as needed. 

.PHONY: clean docker start restart stop migrate_reset

SERVICE_NAME=binkjs
service=
INITIAL_PATH=$(PWD)
ENVIRONMENT=$(NODE_ENV)

RED='\033[91m'
NC='\033[0m' # No Color
YELLOW='\033[93;51m'
GREEN='\033[0;92m'
WHITE='\033[97m'
ORANGE='\033[38;5;208m'
PINK='\033[38;5;206m'

# Determine OS
# https://gist.github.com/sighingnow/deee806603ec9274fd47
OSFLAG 				:=
ifeq ($(OS),Windows_NT)
	OSFLAG += -D WIN32
	ifeq ($(PROCESSOR_ARCHITECTURE),AMD64)
		OSFLAG += -D AMD64
	endif
	ifeq ($(PROCESSOR_ARCHITECTURE),x86)
		OSFLAG += -D IA32
	endif
else
	UNAME_S := $(shell uname -s)
	ifeq ($(UNAME_S),Linux)
		OSFLAG += -D LINUX
	endif
	ifeq ($(UNAME_S),Darwin)
		OSFLAG += -D OSX
	endif
		UNAME_P := $(shell uname -p)
	ifeq ($(UNAME_P),x86_64)
		OSFLAG += -D AMD64
	endif
		ifneq ($(filter %86,$(UNAME_P)),)
	OSFLAG += -D IA32
		endif
	ifneq ($(filter arm%,$(UNAME_P)),)
		OSFLAG += -D ARM
	endif
endif

# export MQ_DATABASE_URL=$(shell aws secretsmanager get-secret-value --secret-id ${NODE_ENV}/file-service | jq -r .SecretString | jq .MQ_DATABASE_URL)

# This single command does everything to get the environment up and running
# WILL DELETE ALL Containers AND RECREATE THEM;
docker-init: init docker-clean docker
init: login clean build generate

prepare:
	@echo "";
	@echo ${YELLOW}Installing Dependencies...${NC} 	  ;
	@npm install --all
	@echo ________________________________ 			  ;
	@echo ${GREEN} DONE! ${NC} 						  ;

	# @echo ${ORANGE}Installing nest-js cli...${NC} 	  ;
	# @npm install -g @nestjs/cli					      ;
	# @echo ${GREEN} DONE! ${NC} 						  ;

	@echo ${ORANGE}Installing aws-cli...${NC} 	  ;

	# Check if OSFLAG contains LINUX, assuming Ubuntu. 
	# If a huge number of Arch users start complaining, we can figure that out. 
	ifeq ($(findstring LINUX,$(OSFLAG)),LINUX)
		sudo apt-get -y install awscli
	endif

	# Check if OSFLAG contains OSX
	ifeq ($(findstring OSX,$(OSFLAG)),OSX)
		brew install awscli
	endif

	# Check if OSFLAG contains WIN32
	ifeq ($(findstring WIN32,$(OSFLAG)),WIN32)
		winget install -e --id Amazon.AWSCLI
	endif

	# Check if OSFLAG contains AMD64
	ifeq ($(findstring AMD64,$(OSFLAG)),AMD64)
		winget install -e --id Amazon.AWSCLI
	endif

	# # Check if OSFLAG contains IA32
	# ifeq ($(findstring IA32,$(OSFLAG)),IA32)
	# 	# Action for IA32
	# 	# ...
	# endif

	# # Check if OSFLAG contains ARM
	# ifeq ($(findstring ARM,$(OSFLAG)),ARM)
	# 	# Action for ARM
	# 	# ...
	# endif

	@echo ${ORANGE}Configuring aws...${NC} 		  	  ;
	@aws configure									  ;  #This may not work for non-Unix systems. 
	@echo ${GREEN} DONE! ${NC} 						  ;
	@echo ${GREEN} Prepare Completed! ${NC} 		  ;
	@echo "" 										  ;

clean:
	@echo ""												;
	@echo ${YELLOW}Clearing Repo...${NC} 					;
	@echo ________________________________ 					;
	@echo ${ORANGE}Removing node_modules...${NC} 		  	;
	@rm -rf ./node_modules									;
	@echo ${GREEN} DONE! ${NC} 						  		;
	@echo ${ORANGE}Removing package-lock.json...${NC} 		;
	@rm -rf ./package-lock.json								;
	@echo ${GREEN} DONE! ${NC} 						  		;
	@echo ${ORANGE}Removing ./dist ...${NC} 		  	 	;
	@rm -rf ./dist											;
	@echo ${GREEN} DONE! ${NC} 								;
	@echo "" 												;

start:
	@echo ""												;
	@echo ${YELLOW}Running ${SERVICE_NAME}...${NC} 			;
	@echo ________________________________ 					;
	@npm start												;	
	@echo ${GREEN} DONE! ${NC} 								;
	@echo "" 												;

test:
	@echo ""												;
	@echo ${YELLOW}Running All Tests...${NC} 				;
	@echo ________________________________ 					;
	@npm run test:cov 										;
	@echo ${GREEN} DONE! ${NC} 								;
	@echo "" 												;

# build:
# 	@echo ""												;
# 	@echo ${YELLOW}Building ${SERVICE_NAME}...${NC} 		;
# 	@echo ________________________________ 					;
# 	@echo ${ORANGE}Installing node_modules...${NC} 			;
# 	@npm install									  		;
# 	@echo ${GREEN} DONE! ${NC} 								;
# 	@echo ${ORANGE}Compiling typescript...${NC} 			;
# 	@npm run build											;
# 	@echo ${GREEN} DONE! ${NC} 								;
# 	@echo "" 												;

# login-staging:
# 	@echo ""												;
# 	@echo ${YELLOW}Logging into AWS...${NC} 				;
# 	@echo ________________________________ 					;
# 	@aws-azure-login --mode=gui	--profile=staging			;
# 	@echo ${GREEN} DONE! ${NC} 								;
# 	@echo ""

# login:
# 	@echo ""												;
# 	@echo ${YELLOW}Logging into AWS...${NC} 				;
# 	@echo ________________________________ 					;
# 	@aws-azure-login --mode=gui 							;
# 	@echo ${GREEN} DONE! ${NC} 								;
# 	@echo "" 												;

# generate:
# 	@echo ""																										;
# 	@echo ${YELLOW}Generating DTOs / ERDs ...${NC} 																	;
# 	@echo ________________________________
# 	@export MQ_DATABASE_URL=$(shell aws secretsmanager get-secret-value --secret-id ${NODE_ENV}/file-service | jq -r .SecretString | jq .MQ_DATABASE_URL | jq -r .) && npx prisma generate																							;
# 	@npm run format 																								;
# 	@echo ${GREEN} DONE! ${NC} 																						;
# 	@echo "" 																										;

# migrate: generate
# 	@echo "";
# 	@echo ${YELLOW}Processing Migration Scripts...${NC} ;
# 	@echo ________________________________ ;
# 	@@export MQ_DATABASE_URL=$(shell aws secretsmanager get-secret-value --secret-id ${NODE_ENV}/file-service | jq -r .SecretString | jq .MQ_DATABASE_URL | jq -r .) && npx prisma migrate dev
# 	@echo ${GREEN} DONE! ${NC} ;
# 	@echo "" ;

# migrate-script: generate
# 	@echo "";
# 	@echo ${YELLOW}Creating Migration Scripts...${NC} ;
# 	@echo ________________________________ ;
# 	@export MQ_DATABASE_URL=$(shell aws secretsmanager get-secret-value --secret-id ${NODE_ENV}/file-service | jq -r .SecretString | jq .MQ_DATABASE_URL | jq -r .) && npx prisma migrate dev --create-only
# 	@echo ${GREEN} DONE! ${NC} ;
# 	@echo "" ;

# migrate-reset: generate
# 	@echo "";
# 	@echo ${ORANGE} WARNING: ${WHITE}This will delete and rebuild the ${YELLOW}${SERVICE_NAME}${WHITE} database on your local machine.  ${RED}All data will be lost !! ${PINK};
# 	@read -p " Press ENTER or RETURN key to continue..." ;
# 	@echo ${NC}	;
# 	@echo ${YELLOW}Resetting Database...${NC} ;
# 	@echo ________________________________ ;
# 	@export MQ_DATABASE_URL=$(shell aws secretsmanager get-secret-value --secret-id docker/file-service | jq -r .SecretString | jq .MQ_DATABASE_URL | jq -r .) && @npx prisma migrate reset;
# 	@echo ${GREEN} DONE! ${NC} ;
# 	@echo "" ;

# # Show Secrets
# secrets:
# ifdef service
# 	@echo "";
# 	@echo ${YELLOW}Showing ${SERVICE_NAME} secrets...${NC} ;
# 	@echo ________________________________ ;
# 	@aws secretsmanager get-secret-value --secret-id development/${SERVICE_NAME} ;
# 	@echo ${GREEN} DONE! ${NC} ;
# 	@echo ""					;
# else
# 	@echo "";
# 	@echo ${YELLOW}Showing common secrets...${NC} ;
# 	@echo ________________________________ ;
# 	@aws secretsmanager get-secret-value --secret-id development/common ;
# 	@echo ${GREEN} DONE! ${NC} ;
# 	@echo ""
# endif

# Docker Commands
docker-clean: # WILL DELETE Containers/Images
	@echo "";
	@echo ${ORANGE} WARNING: ${WHITE}This will delete and rebuild related containers / images on your local machine !! ${PINK};
	@read -p "Press ENTER or RETURN key to continue..." ;
	@echo ${NC}											;
	@echo ${YELLOW}Stopping Required Containers...${NC} ;
	@echo ________________________________ 				;
	@docker compose down 								;
	@echo ${GREEN} DONE! ${NC} 							;
	@echo "" 											;

	@echo ${YELLOW}Removing Docker Images From Cache...${NC} 	;
	@echo ________________________________ 						;
	@docker image rm ${SERVICE_NAME}_svc -f 					;
	@echo ${GREEN} DONE! ${NC} 									;
	@echo "" 													;

docker:
	@echo ""																							;
	@echo ${YELLOW}Bulding Docker Images...${NC} 														;
	@echo ________________________________ 																;
	@docker compose down --remove-orphans																;
	@docker compose build --build-arg BUILD_ENV=docker --build-arg GH_TOKEN=${GH_TOKEN} --force-rm 		;
	@echo ${GREEN} DONE! ${NC} 																			;
	@echo "" 																							;

docker-modules: # Runs npm install on container
	@echo "";
	@echo ${YELLOW}Installing node modules in container...${NC} 										;
	@echo ________________________________ 																;
	@docker exec -it ${SERVICE_NAME} sh -c "npm install" 												;
	@echo ${GREEN} DONE! ${NC} 																			;
	@echo "" 																							;

docker-start: # Starts the docker containers
	@echo ""												;
	@echo ${YELLOW}Starting Docker Containers...${NC} 		;
	@echo ________________________________ 					;
	@docker compose -p ${SERVICE_NAME} up --remove-orphans	;
	@echo ${GREEN} DONE! ${NC} 								;
	@echo ""												;

docker-restart: # Restarts docker container
	@echo ""												;
	@echo ${YELLOW}Restarting Docker Containers...${NC} 	;
	@echo ________________________________ 					;
	@docker compose restart ${SERVICE_NAME}					;
	@echo ${GREEN} DONE! ${NC} 								;
	@echo "" 												;

docker-stop: # stops docker containers
	@echo ""												;
	@echo ${YELLOW}Stopping Docker Containers...${NC} 		;
	@echo ________________________________ 					;
	@docker compose stop ${SERVICE_NAME} 									;
	@echo ${GREEN} DONE! ${NC} 								;
	@echo "" 												;

docker-shell: # Gets a login shell on the container
	@echo ""													;
	@echo ${YELLOW}Installing node modules in container...${NC} ;
	@echo ________________________________ 						;
	@docker exec -it ${SERVICE_NAME} sh -c "/bin/sh" 			;
	@echo ${GREEN} DONE! ${NC} 									;
	@echo "" 													;

# Docker Database Commands
docker-generate: # Generates prisma client
	@echo ""																										;
	@echo ${YELLOW}Generating DTOs / ERDs ...${NC} 																	;
	@echo ________________________________ 																			;
	@export DOCKER_DB=$(shell aws secretsmanager get-secret-value --secret-id docker/file-service | jq -r .SecretString | jq .MQ_DATABASE_URL | jq -r .) ;
	@echo using ${MQ_DATABASE_URL}																 ;
	@docker exec -it ${SERVICE_NAME} sh -c "MQ_DATABASE_URL=${DOCKER_DB} npx prisma migrate dev"  ;
	@npm run format 																								;
	@echo ${GREEN} DONE! ${NC} 																						;
	@echo ""

docker-migrate-script: docker-generate # Generates migration scripts based on schema changes
	@echo "";
	@echo ${YELLOW}Creating Migration Scripts...${NC} ;
	@echo ________________________________ ;
	@docker exec -it ${SERVICE_NAME} sh -c "MQ_DATABASE_URL=${DOCKER_DB} npx prisma migrate dev --create-only"  ;
	@echo ${GREEN} DONE! ${NC} ;
	@echo "" ;

docker-migrate: docker-generate # Runs any pending migration scripts produced by docker-migrate-script
	@echo ""																					 ;
	@echo ${YELLOW}Installing node modules in container...${NC} 								 ;
	@echo ________________________________ 														 ;
	@export MQ_DATABASE_URL=${DOCKER_DB} 														 ;
	@echo using ${MQ_DATABASE_URL}																 ;
	@docker exec -it ${SERVICE_NAME} sh -c "MQ_DATABASE_URL=${DOCKER_DB} npx prisma migrate dev"  ;
	@echo ${GREEN} DONE! ${NC} 																	 ;
	@echo "" 																					 ;

docker-migrate-reset: docker-generate # Resets databse
	@echo "";
	@echo ${ORANGE} WARNING: ${WHITE}This will delete and rebuild the ${YELLOW}${SERVICE_NAME}${WHITE} database on your local machine.  ${RED}All data will be lost !! ${PINK};
	@read -p " Press ENTER or RETURN key to continue..." ;
	@echo ${NC}	;
	@echo ${YELLOW}Resetting Database...${NC} ;
	@echo ________________________________ ;
	@docker exec -it ${SERVICE_NAME} sh -c "MQ_DATABASE_URL=${DOCKER_DB} npx prisma migrate reset"  ;
	@echo ${GREEN} DONE! ${NC} ;
	@echo "" ;

docker-secrets:
ifdef service
	@echo "";
	@echo ${YELLOW}Showing ${SERVICE_NAME} secrets...${NC} ;
	@echo ________________________________ ;
	@docker exec -it ${SERVICE_NAME} sh -c "aws secretsmanager get-secret-value --secret-id docker/${SERVICE_NAME}"  ;
	@echo ${GREEN} DONE! ${NC} ;
	@echo ""					;
else
	@echo "";
	@echo ${YELLOW}Showing common secrets...${NC} ;
	@echo ________________________________ ;
	@docker exec -it ${SERVICE_NAME} sh -c "aws secretsmanager get-secret-value --secret-id docker/common"  ;
	@echo ${GREEN} DONE! ${NC} ;
	@echo ""
endif



