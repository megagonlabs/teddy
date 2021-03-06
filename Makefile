VENV_NAME?=venv
PYTHON=$(PWD)/$(VENV_NAME)/bin/python
PIP=$(PWD)/$(VENV_NAME)/bin/pip
export DATA_DIR = $(PWD)/data


data: $(EXTRACTIONS)
	$(PYTHON) preprocessing_scripts/full_pipeline.py $<

venv:
	test -d $(VENV_NAME) || python3 -m venv $(VENV_NAME)
	. $(VENV_NAME)/bin/activate

install: venv config
	$(PIP) install .
	@cd app/react-app; npm install
	@pip install  -U -e .\[tests\]
	@$(PYTHON) -m spacy download en_core_web_sm
	@unzip data/tripadvisor_hotels.zip -d data

build: venv
	npm build app/react-app

test: venv
	nosetests tests/*.py

server: venv
	cd app; $(PYTHON) app.py

ui: venv
	cd app/react-app; npm start


config: keys
	./scripts/config.sh
	/bin/bash ./app/react-app/.env
	
keys:
	./scripts/keys.sh
	

gitclean:
	#TODO

uninstall:
	#TODO

$(EXTRACTIONS):

